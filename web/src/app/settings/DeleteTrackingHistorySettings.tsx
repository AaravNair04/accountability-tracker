"use client";

import {
  useState
} from "react";


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

        return;
      }

      const deleted =
        data.deleted ?? {};

      setConfirmation(
        ""
      );

      setMessage(
        [
          `Deleted ${deleted.usageSessions ?? 0} usage sessions`,
          `${deleted.dailyReports ?? 0} reports`,
          `${deleted.trackingEvents ?? 0} device events`
        ].join(
          ", "
        ) + "."
      );

    } catch (error) {
      console.error(
        "Tracking history delete failed:",
        error
      );

      setMessage(
        "Could not delete tracking history."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <section
      style={{
        marginTop:
          "32px",

        borderTop:
          "1px solid #ddd",

        paddingTop:
          "24px"
      }}
    >

      <h2>
        Delete tracking history
      </h2>


      <p>
        Permanently delete your usage sessions,
        daily reports, report delivery/view status,
        peer responses on those reports, and device
        tracking events. Your account, peers, devices,
        timezone, and tracked websites stay in place.
      </p>


      <label
        style={{
          display:
            "block",

          marginBottom:
            "10px"
        }}
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
        style={{
          width:
            "100%",

          boxSizing:
            "border-box",

          padding:
            "10px 12px",

          marginBottom:
            "12px"
        }}
      />


      <button
        type="button"
        disabled={
          loading ||
          confirmation !==
            CONFIRMATION_TEXT
        }
        onClick={deleteTrackingHistory}
        style={{
          padding:
            "10px 16px",

          border:
            "1px solid #8a1f1f",

          borderRadius:
            "6px",

          color:
            "#8a1f1f",

          background:
            "#fff",

          cursor:
            loading ||
            confirmation !==
              CONFIRMATION_TEXT
              ? "not-allowed"
              : "pointer"
        }}
      >
        {
          loading
            ? "Deleting..."
            : "Delete tracking history"
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

    </section>
  );
}
