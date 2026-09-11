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
    email,
    setEmail
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


    if (!email.trim()) {
      setMessage(
        "Please enter an email."
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
                email
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


      setEmail("");


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
        Peer&apos;s email
      </label>


      <input
        id="peerEmail"
        type="email"
        value={email}
        onChange={
          (event) =>
            setEmail(
              event.target.value
            )
        }
        placeholder="friend@example.com"
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
