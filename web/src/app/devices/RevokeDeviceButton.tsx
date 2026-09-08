"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


type Props = {
  deviceId: string;
};


export default function RevokeDeviceButton({
  deviceId
}: Props) {

  const router =
    useRouter();


  const [
    loading,
    setLoading
  ] =
    useState(false);


  const [
    error,
    setError
  ] =
    useState("");


  async function revokeDevice() {

    const confirmed =
      window.confirm(
        "Revoke this device? It will no longer be allowed to upload tracking data."
      );


    if (!confirmed) {
      return;
    }


    setLoading(true);
    setError("");


    try {

      const response =
        await fetch(
          "/api/devices/revoke",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                deviceId
              })
          }
        );


      const text =
        await response.text();


      let data: {
        success?: boolean;
        error?: string;
      } = {};


      try {
        data =
          text
            ? JSON.parse(text)
            : {};
      } catch {
        // Keep an empty response object.
      }


      if (!response.ok) {

        setError(
          data.error ??
          "Failed to revoke device."
        );

        return;
      }


      router.refresh();

    } catch {

      setError(
        "Could not contact the server."
      );

    } finally {

      setLoading(false);

    }
  }


  return (
    <div>

      <button
        type="button"
        onClick={
          revokeDevice
        }
        disabled={
          loading
        }
      >
        {
          loading
            ? "Revoking..."
            : "Revoke Device"
        }
      </button>


      {
        error && (
          <p
            style={{
              color:
                "crimson",

              fontSize:
                "13px"
            }}
          >
            {error}
          </p>
        )
      }

    </div>
  );
}