"use client";

import {
  FormEvent,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


export default function PeerInviteForm() {

  const router =
    useRouter();


  const [
    peerIdentifier,
    setPeerIdentifier
  ] =
    useState("");


  const [
    message,
    setMessage
  ] =
    useState("");


  const [
    loading,
    setLoading
  ] =
    useState(false);


  async function handleSubmit(
    event: FormEvent
  ) {

    event.preventDefault();


    if (!peerIdentifier.trim()) {
      setMessage(
        "Please enter an email or username."
      );

      return;
    }


    setLoading(true);

    setMessage("");


    try {

      const response =
        await fetch(
          "/api/peers/invite",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                peerIdentifier
              })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        setMessage(
          data.error ??
          "Invitation failed."
        );

        return;
      }


      setMessage(
        data.message ??
        "Invitation sent."
      );


      setPeerIdentifier("");


      // Refresh server data.
      router.refresh();

    } catch (error) {

      console.error(
        "Invitation failed:",
        error
      );


      setMessage(
        "Could not send invitation."
      );

    } finally {

      setLoading(false);

    }
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="max-w-xl space-y-3"
    >

      <label
        htmlFor="peerEmail"
        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        Peer&apos;s email or username
      </label>


      <input
        id="peerEmail"
        type="text"
        value={peerIdentifier}
        onChange={
          (event) =>
            setPeerIdentifier(
              event.target.value
            )
        }
        placeholder="friend@example.com or @friend"
        disabled={loading}
        className="w-full rounded-lg border px-4 py-3"
      />


      <button
        type="submit"
        disabled={loading}
        className="app-button-primary"
      >

        {
          loading
            ? "Sending..."
            : "Send Invitation"
        }

      </button>


      {
        message && (

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>

        )
      }

    </form>
  );
}
