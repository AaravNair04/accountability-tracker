"use client";

import {
  useState
} from "react";

import {
  showToast
} from "@/components/ToastViewport";

const CONFIRMATION_TEXT =
  "DELETE";


type DeleteCounts = {
  reportResponses?: number;
  reportDeliveries?: number;
  dailyReports?: number;
  usageSessions?: number;
  trackingEvents?: number;
};


export default function DeleteTrackingHistorySettings() {
  const [
    confirmation,
    setConfirmation
  ] =
    useState("");

  const [
    loading,
    setLoading
  ] =
    useState(false);

  const [
    message,
    setMessage
  ] =
    useState("");


  async function deleteTrackingHistory() {
    if (
      confirmation !==
      CONFIRMATION_TEXT
    ) {
      setMessage(
        `Type ${CONFIRMATION_TEXT} to confirm.`
      );

      showToast(
        `Type ${CONFIRMATION_TEXT} to confirm.`,
        "error"
      );

      return;
    }

    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/tracking-history",
          {
            method:
              "DELETE"
          }
        );

      const data =
        await response.json() as {
          error?: string;
          deleted?: DeleteCounts;
        };

      if (
        !response.ok
      ) {
        setMessage(
          data.error ??
          "Could not delete tracking history."
        );

        showToast(
          data.error ??
          "Could not delete tracking history.",
          "error"
        );

        return;
      }

      const deleted =
        data.deleted ?? {};

      setConfirmation(
        ""
      );

      const successMessage =
        [
          `Deleted ${deleted.usageSessions ?? 0} usage sessions`,
          `${deleted.dailyReports ?? 0} reports`,
          `${deleted.trackingEvents ?? 0} device events`
        ].join(
          ", "
        ) + ".";

      setMessage(
        successMessage
      );

      showToast(
        successMessage
      );

    } catch (error) {
      console.error(
        "Tracking history delete failed:",
        error
      );

      setMessage(
        "Could not delete tracking history."
      );

      showToast(
        "Could not delete tracking history.",
        "error"
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <section className="rounded-lg border border-red-100 bg-red-50/60 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">

      <h2 className="text-xl font-semibold tracking-normal text-red-900 dark:text-red-100">
        Delete tracking history
      </h2>


      <p className="mt-2 text-sm text-red-800/80 dark:text-red-100/80">
        Permanently delete your usage sessions,
        daily reports, report delivery/view status,
        peer responses on those reports, and device
        tracking events. Your account, peers, devices,
        timezone, and tracked websites stay in place.
      </p>


      <label
        className="mt-5 block text-sm font-semibold text-red-900 dark:text-red-100"
      >
        Type DELETE to confirm
      </label>


      <input
        type="text"
        value={confirmation}
        disabled={loading}
        onChange={
          (event) =>
            setConfirmation(
              event.target.value
            )
        }
        className="mt-2 w-full rounded-lg border px-4 py-3"
      />


      <button
        type="button"
        disabled={
          loading ||
          confirmation !==
            CONFIRMATION_TEXT
        }
        onClick={deleteTrackingHistory}
        className="app-button-danger mt-4"
      >
        {
          loading
            ? "Deleting..."
            : "Delete tracking history"
        }
      </button>


      {
        message && (
          <p className="mt-4 text-sm text-red-800 dark:text-red-100">
            {message}
          </p>
        )
      }

    </section>
  );
}
