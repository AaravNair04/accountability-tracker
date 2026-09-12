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
    <section className="app-card">

      <h2 className="app-section-title">
        Timezone
      </h2>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your reports use your timezone to
        determine when each day starts and ends.
      </p>


      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
        <strong>
          Saved timezone:
        </strong>{" "}

        {savedTimezone}
        </p>


        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
        <strong>
          Browser timezone:
        </strong>{" "}

        {
          detectedTimezone ||
          "Detecting..."
        }
        </p>
      </div>


      {
        detectedTimezone &&
        detectedTimezone !==
          savedTimezone
          ? (

            <button
              type="button"
              disabled={loading}
              onClick={saveTimezone}
              className="app-button-primary mt-4"
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

              <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Your saved timezone matches
                this browser.
              </p>

            )
            : null
      }


      {
        message && (

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>

        )
      }

    </section>
  );
}
