"use client";

import {
  useEffect,
  useState
} from "react";


type Props = {
  currentTimezone: string;
};


export default function TimezoneSettings({
  currentTimezone
}: Props) {

  const [
    detectedTimezone,
    setDetectedTimezone
  ] =
    useState("");


  const [
    savedTimezone,
    setSavedTimezone
  ] =
    useState(
      currentTimezone
    );


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


  // Detect the browser's IANA timezone.
  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            const timezone =
              Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone;

            setDetectedTimezone(
              timezone
            );
          },
          0
        );

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };

    },
    []
  );


  async function saveTimezone() {

    if (!detectedTimezone) {
      return;
    }


    setLoading(true);
    setMessage("");


    try {

      const response =
        await fetch(
          "/api/settings/timezone",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                timezone:
                  detectedTimezone
              })
          }
        );


      const responseText =
        await response.text();


      let data: {
        error?: string;
        message?: string;
        timezone?: string;
      };


      try {

        data =
          JSON.parse(
            responseText
          );

      } catch {

        console.error(
          "Non-JSON response:",
          responseText
        );


        setMessage(
          `Server error (${response.status}).`
        );

        return;

      }


      if (!response.ok) {

        setMessage(
          data.error ??
          "Could not update timezone."
        );

        return;

      }


      setSavedTimezone(
        data.timezone ??
        detectedTimezone
      );


      setMessage(
        "Timezone updated successfully."
      );


    } catch (error) {

      console.error(
        "Timezone update failed:",
        error
      );


      setMessage(
        "Could not update timezone."
      );

    } finally {

      setLoading(false);

    }

  }


  return (
    <section>

      <h2>
        Timezone
      </h2>


      <p>
        Your reports use your timezone to
        determine when each day starts and ends.
      </p>


      <p>
        <strong>
          Saved timezone:
        </strong>{" "}

        {savedTimezone}
      </p>


      <p>
        <strong>
          Browser timezone:
        </strong>{" "}

        {
          detectedTimezone ||
          "Detecting..."
        }
      </p>


      {
        detectedTimezone &&
        detectedTimezone !==
          savedTimezone
          ? (

            <button
              type="button"
              disabled={loading}
              onClick={saveTimezone}
              style={{
                padding: "10px 16px",
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer"
              }}
            >

              {
                loading
                  ? "Updating..."
                  : `Use ${detectedTimezone}`
              }

            </button>

          )
          : detectedTimezone
            ? (

              <p>
                ✓ Your saved timezone matches
                this browser.
              </p>

            )
            : null
      }


      {
        message && (

          <p
            style={{
              marginTop: "10px"
            }}
          >
            {message}
          </p>

        )
      }

    </section>
  );
}
