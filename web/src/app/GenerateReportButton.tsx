"use client";

import {
  useState
} from "react";


type GenerateResponse = {
  error?: string;
  message?: string;
};


export default function GenerateReportButton() {
  const [
    loading,
    setLoading
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage
  ] =
    useState(
      ""
    );


  async function generateReport() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/reports/generate",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                {}
              )
          }
        );

      const text =
        await response.text();

      let data:
        GenerateResponse = {};

      try {
        data =
          text
            ? JSON.parse(
                text
              ) as
                GenerateResponse
            : {};
      } catch {
        data = {};
      }

      if (
        !response.ok
      ) {
        setMessage(
          data.error ??
          "Could not generate report."
        );

        return;
      }

      setMessage(
        data.message ??
        "Today's preview report generated."
      );

    } catch (error) {
      console.error(
        "Report generation failed:",
        error
      );

      setMessage(
        "Could not generate report."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={
          loading
        }
        onClick={
          generateReport
        }
        className="app-button-primary"
      >
        {
          loading
            ? "Generating..."
            : "Generate Today's Preview"
        }
      </button>

      {
        message && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>
        )
      }
    </div>
  );
}
