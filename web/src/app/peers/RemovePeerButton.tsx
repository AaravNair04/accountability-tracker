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
    <div className="mt-4">
      <button
        type="button"
        onClick={removePeer}
        disabled={loading}
        className="app-button-danger"
      >
        {
          loading
            ? "Removing..."
            : "Remove Peer"
        }
      </button>

      {
        message && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>
        )
      }
    </div>
  );
}
