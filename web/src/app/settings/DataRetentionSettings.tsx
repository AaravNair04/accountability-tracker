"use client";

import {
  useState
} from "react";


type Props = {
  currentRetentionDays: number | null;
};


const OPTIONS =
  [
    {
      label:
        "Never automatically delete raw data",

      value:
        "never"
    },
    {
      label:
        "Keep raw data for 30 days",

      value:
        "30"
    },
    {
      label:
        "Keep raw data for 90 days",

      value:
        "90"
    },
    {
      label:
        "Keep raw data for 180 days",

      value:
        "180"
    },
    {
      label:
        "Keep raw data for 365 days",

      value:
        "365"
    }
  ];


function valueFromRetentionDays(
  retentionDays: number | null
) {
  return retentionDays ===
    null
    ? "never"
    : String(
        retentionDays
      );
}


export default function DataRetentionSettings({
  currentRetentionDays
}: Props) {
  const [
    selectedValue,
    setSelectedValue
  ] =
    useState(
      valueFromRetentionDays(
        currentRetentionDays
      )
    );

  const [
    savedValue,
    setSavedValue
  ] =
    useState(
      valueFromRetentionDays(
        currentRetentionDays
      )
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


  async function saveRetentionPolicy() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    const rawDataRetentionDays =
      selectedValue ===
        "never"
        ? null
        : Number(
            selectedValue
          );

    try {
      const response =
        await fetch(
          "/api/settings/data-retention",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                rawDataRetentionDays
              })
          }
        );

      const data =
        await response.json() as {
          error?: string;
          rawDataRetentionDays?: number | null;
          cleanup?: {
            deleted?: {
              usageSessions?: number;
              trackingEvents?: number;
            };
          } | null;
        };

      if (
        !response.ok
      ) {
        setMessage(
          data.error ??
          "Could not update data retention."
        );

        return;
      }

      const nextValue =
        valueFromRetentionDays(
          data.rawDataRetentionDays ??
          null
        );

      setSavedValue(
        nextValue
      );

      setSelectedValue(
        nextValue
      );

      const deleted =
        data.cleanup?.deleted;

      setMessage(
        deleted
          ? `Retention saved. Deleted ${deleted.usageSessions ?? 0} expired usage sessions and ${deleted.trackingEvents ?? 0} expired device events.`
          : "Retention saved."
      );

    } catch (error) {
      console.error(
        "Data retention update failed:",
        error
      );

      setMessage(
        "Could not update data retention."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <section className="app-card">

      <h2 className="app-section-title">
        Data retention
      </h2>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Automatically delete old raw usage sessions
        and device tracking events. Daily reports are
        kept so your accountability history remains
        readable.
      </p>


      <select
        value={selectedValue}
        disabled={loading}
        onChange={
          (event) =>
            setSelectedValue(
              event.target.value
            )
        }
        className="mt-5 w-full rounded-lg border px-4 py-3"
      >
        {
          OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )
        }
      </select>


      <button
        type="button"
        disabled={
          loading ||
          selectedValue ===
            savedValue
        }
        onClick={saveRetentionPolicy}
        className="app-button-primary mt-4"
      >
        {
          loading
            ? "Saving..."
            : "Save retention policy"
        }
      </button>


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
