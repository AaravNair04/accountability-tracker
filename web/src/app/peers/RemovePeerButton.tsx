"use client";

import {
  useRouter
} from "next/navigation";

import {
  useState
} from "react";


type Props = {
  relationshipId: string;
  peerEmail: string;
};


export default function RemovePeerButton({
  relationshipId,
  peerEmail
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


  async function removePeer() {
    const confirmed =
      window.confirm(
        `Stop sharing accountability reports with ${peerEmail}?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/peers/remove",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                relationshipId
              })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ??
          "Could not remove peer."
        );

        return;
      }

      setMessage(
        data.message ??
        "Peer access revoked."
      );

      router.refresh();

    } catch (error) {
      console.error(
        "Peer removal failed:",
        error
      );

      setMessage(
        "Could not remove peer."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      style={{
        marginTop:
          "14px"
      }}
    >
      <button
        type="button"
        onClick={removePeer}
        disabled={loading}
        style={{
          padding:
            "10px 14px",

          border:
            "1px solid #b00020",

          borderRadius:
            "6px",

          background:
            "white",

          color:
            "#b00020",

          cursor:
            loading
              ? "not-allowed"
              : "pointer"
        }}
      >
        {
          loading
            ? "Removing..."
            : "Remove Peer"
        }
      </button>

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
