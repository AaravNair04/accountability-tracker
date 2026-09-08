"use client";

import {
  useState
} from "react";


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
    useState(false);


  const [
    status,
    setStatus
  ] =
    useState("");


  async function submitResponse() {

    const trimmedMessage =
      message.trim();


    if (
      trimmedMessage.length === 0
    ) {

      setStatus(
        "Please enter a response."
      );

      return;
    }


    setSaving(true);

    setStatus("");


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
        success?: boolean;
        error?: string;
      } = {};


      if (text) {

        try {

          data =
            JSON.parse(
              text
            );

        } catch {

          data = {};

        }

      }


      if (
        !response.ok
      ) {

        setStatus(
          data.error ??
          "Failed to save response."
        );

        return;
      }


      setStatus(
        "Response saved."
      );

    } catch (
      error
    ) {

      console.error(
        "Response submission failed:",
        error
      );


      setStatus(
        "Something went wrong."
      );

    } finally {

      setSaving(false);

    }

  }


  return (
    <section
      style={{
        marginTop:
          "30px",

        paddingTop:
          "20px",

        borderTop:
          "1px solid #ddd"
      }}
    >

      <h2>
        Your Response
      </h2>


      <p>
        Leave a short message for
        the person you are
        holding accountable.
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

        style={{
          width:
            "100%",

          padding:
            "12px",

          border:
            "1px solid #ccc",

          borderRadius:
            "8px",

          resize:
            "vertical",

          marginTop:
            "10px"
        }}
      />


      <p>
        {
          message.length
        }
        /1000
      </p>


      <button
        type="button"

        disabled={
          saving
        }

        onClick={
          submitResponse
        }

        style={{
          padding:
            "10px 16px",

          cursor:
            saving
              ? "not-allowed"
              : "pointer"
        }}
      >

        {
          saving
            ? "Saving..."
            : initialMessage
              ? "Update Response"
              : "Send Response"
        }

      </button>


      {
        status &&
        (
          <p
            style={{
              marginTop:
                "10px"
            }}
          >
            {
              status
            }
          </p>
        )
      }

    </section>
  );

}