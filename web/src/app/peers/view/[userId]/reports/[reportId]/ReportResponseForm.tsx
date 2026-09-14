"use client";

import {
  useState
} from "react";

import {
  showToast
} from "@/components/ToastViewport";

type Props = {
  reportId: string;
  initialMessage: string;
};


export default function ReportResponseForm({
  reportId,
  initialMessage
}: Props) {
  const [
    message,
    setMessage
  ] =
    useState(
      initialMessage
    );

  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );

  const [
    status,
    setStatus
  ] =
    useState(
      ""
    );

  const [
    hasSavedResponse,
    setHasSavedResponse
  ] =
    useState(
      Boolean(
        initialMessage
      )
    );


  async function submitResponse() {
    const trimmedMessage =
      message.trim();

    if (
      !trimmedMessage
    ) {
      setStatus(
        "Please enter a response."
      );

      showToast(
        "Please enter a response.",
        "error"
      );

      return;
    }

    setSaving(
      true
    );

    setStatus(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/report-responses",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                reportId,

                message:
                  trimmedMessage
              })
          }
        );

      const text =
        await response.text();

      let data: {
        error?: string;
      } = {};

      try {
        data =
          text
            ? JSON.parse(
                text
              )
            : {};
      } catch {
        data = {};
      }

      if (
        !response.ok
      ) {
        setStatus(
          data.error ??
          "Failed to save response."
        );

        showToast(
          data.error ??
          "Failed to save response.",
          "error"
        );

        return;
      }

      setMessage(
        trimmedMessage
      );

      setHasSavedResponse(
        true
      );

      setStatus(
        "Response saved."
      );

      showToast(
        "Response saved."
      );

    } catch (error) {
      console.error(
        "Response submission failed:",
        error
      );

      setStatus(
        "Something went wrong."
      );

      showToast(
        "Something went wrong.",
        "error"
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  return (
    <section className="app-card">
      <h2 className="app-section-title">
        Your Response
      </h2>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Leave a short message for the person
        you are holding accountable.
      </p>

      <textarea
        value={
          message
        }
        onChange={
          (
            event
          ) =>
            setMessage(
              event.target.value
            )
        }
        maxLength={
          1000
        }
        rows={
          6
        }
        className="mt-4 w-full rounded-lg border px-4 py-3"
      />

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {message.length}/1000
      </p>

      <button
        type="button"
        disabled={
          saving
        }
        onClick={
          submitResponse
        }
        className="app-button-primary mt-4"
      >
        {
          saving
            ? "Saving..."
            : hasSavedResponse
              ? "Update Response"
              : "Send Response"
        }
      </button>

      {
        status && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {status}
          </p>
        )
      }
    </section>
  );
}
