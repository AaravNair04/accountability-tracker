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
    <div
      style={{
        marginTop:
          "20px"
      }}
    >
      <button
        type="button"
        disabled={
          loading
        }
        onClick={
          generateReport
        }
        style={{
          padding:
            "10px 16px",

          cursor:
            loading
              ? "not-allowed"
              : "pointer"
        }}
      >
        {
          loading
            ? "Generating..."
            : "Generate Today's Preview"
        }
      </button>

      {
        message && (
          <p
            style={{
              marginTop:
                "10px"
            }}
          >
            {message}
          </p>
        )
      }
    </div>
  );
}
