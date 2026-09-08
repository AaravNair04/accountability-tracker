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
      style={{
        maxWidth: "500px"
      }}
    >

      <label
        htmlFor="peerEmail"
        style={{
          display: "block",
          marginBottom: "8px"
        }}
      >
        Peer's email
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
        style={{
          width: "100%",
          boxSizing:
            "border-box",

          padding: "10px",

          marginBottom:
            "10px"
        }}
      />


      <button
        type="submit"
        disabled={loading}
        style={{
          padding:
            "10px 16px",

          cursor:
            loading
              ? "not-allowed"
              : "pointer"
        }}
      >

        {
          loading
            ? "Sending..."
            : "Send Invitation"
        }

      </button>


      {
        message && (

          <p
            style={{
              marginTop:
                "12px"
            }}
          >
            {message}
          </p>

        )
      }

    </form>
  );
}