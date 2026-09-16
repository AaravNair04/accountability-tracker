"use client";

import {
  useRouter
} from "next/navigation";
import {
  useState
} from "react";

import {
  showToast
} from "@/components/ToastViewport";


type RetryReportEmailsButtonProps = {
  reportId: string;
  unsentCount: number;
};

type RetryReportEmailsResponse = {
  error?: string;
  attempted?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
};


export default function RetryReportEmailsButton({
  reportId,
  unsentCount
}: RetryReportEmailsButtonProps) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(false);

  async function retryEmails() {
    setLoading(
      true
    );

    try {
      const response =
        await fetch(
          "/api/reports/resend-emails",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                reportId
              })
          }
        );

      const data =
        await response.json()
          .catch(
            () => ({}) as RetryReportEmailsResponse
          ) as RetryReportEmailsResponse;

      if (
        !response.ok
      ) {
        showToast(
          data.error ??
          "Could not retry report emails.",
          "error"
        );

        return;
      }

      showToast(
        `Retried ${data.attempted ?? 0} email${(data.attempted ?? 0) === 1 ? "" : "s"}. Sent ${data.sent ?? 0}. Failed ${data.failed ?? 0}.`,
        (data.failed ?? 0) > 0
          ? "error"
          : "success"
      );

      router.refresh();

    } catch (error) {
      console.error(
        "Report email retry failed:",
        error
      );

      showToast(
        "Could not retry report emails.",
        "error"
      );

    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <button
      type="button"
      className="app-button-secondary"
      disabled={loading}
      onClick={retryEmails}
    >
      {
        loading
          ? "Retrying..."
          : `Retry ${unsentCount} email${unsentCount === 1 ? "" : "s"}`
      }
    </button>
  );
}
