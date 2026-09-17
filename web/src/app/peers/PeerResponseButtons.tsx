"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


type Props = {
  invitationId: string;
};


export default function PeerResponseButtons({
  invitationId
}: Props) {

  const router =
    useRouter();


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


  async function respond(
    action: "accept" | "reject"
  ) {

    setLoading(true);
    setMessage("");


    try {

      const response =
        await fetch(
          "/api/peers/respond",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                invitationId,
                action
              })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        setMessage(
          data.error ??
          "Something went wrong."
        );

        return;
      }


      setMessage(
        data.message ??
        "Invitation updated."
      );

      window.dispatchEvent(
        new Event(
          "accountability:notifications-changed"
        )
      );


      // Reload server-side peer data.
      router.refresh();

    } catch (error) {

      console.error(
        "Peer response failed:",
        error
      );


      setMessage(
        "Could not respond to invitation."
      );

    } finally {

      setLoading(false);

    }
  }


  return (
    <div
      style={{
        marginTop: "12px"
      }}
    >

      <div
        style={{
          display: "flex",
          gap: "10px"
        }}
      >

        <button
          type="button"
          disabled={loading}
          onClick={
            () =>
              respond("accept")
          }
          style={{
            padding:
              "8px 14px",

            cursor:
              loading
                ? "not-allowed"
                : "pointer"
          }}
        >
          {
            loading
              ? "Processing..."
              : "Accept"
          }
        </button>


        <button
          type="button"
          disabled={loading}
          onClick={
            () =>
              respond("reject")
          }
          style={{
            padding:
              "8px 14px",

            cursor:
              loading
                ? "not-allowed"
                : "pointer"
          }}
        >
          Reject
        </button>

      </div>


      {
        message && (
          <p>
            {message}
          </p>
        )
      }

    </div>
  );
}
