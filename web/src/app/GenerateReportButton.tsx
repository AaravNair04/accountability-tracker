"use client";

import {
  useState
} from "react";


export default function GenerateReportButton() {

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");


  async function generateReport() {

    setLoading(true);
    setMessage("");


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
              JSON.stringify({})
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        setMessage(
          data.error ??
          "Could not generate report."
        );

        return;

      }


      setMessage(
        "Today's report generated successfully."
      );


      console.log(
        "Generated report:",
        data.report
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

      setLoading(false);

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
        disabled={loading}
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
            : "Generate Today's Report"
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