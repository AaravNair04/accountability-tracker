"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


type Props = {
  deviceId: string;
  currentName: string;
};


export default function RenameDeviceForm({
  deviceId,
  currentName
}: Props) {
  const router =
    useRouter();

  const [
    name,
    setName
  ] =
    useState(
      currentName
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


  async function renameDevice() {
    const nextName =
      name.trim();

    if (
      nextName ===
      currentName
    ) {
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
          "/api/devices/rename",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                deviceId,
                name:
                  nextName
              })
          }
        );

      const data =
        await response.json() as {
          error?: string;
        };

      if (
        !response.ok
      ) {
        setMessage(
          data.error ??
          "Could not rename device."
        );

        return;
      }

      setMessage(
        "Device renamed."
      );

      router.refresh();

    } catch (error) {
      console.error(
        "Device rename failed:",
        error
      );

      setMessage(
        "Could not rename device."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  return (
    <div
      style={{
        display:
          "flex",
        flexWrap:
          "wrap",
        gap:
          "8px",
        alignItems:
          "center",
        margin:
          "12px 0"
      }}
    >
      <input
        type="text"
        value={name}
        disabled={loading}
        onChange={
          (event) =>
            setName(
              event.target.value
            )
        }
        style={{
          flex:
            "1 1 220px",
          minWidth:
            0,
          padding:
            "8px 10px"
        }}
      />

      <button
        type="button"
        disabled={
          loading ||
          name.trim() ===
            currentName
        }
        onClick={renameDevice}
      >
        {
          loading
            ? "Saving..."
            : "Rename"
        }
      </button>

      {
        message && (
          <p
            style={{
              flexBasis:
                "100%",
              margin:
                0,
              color:
                message.includes(
                  "renamed"
                )
                  ? "#276738"
                  : "crimson",
              fontSize:
                "13px"
            }}
          >
            {message}
          </p>
        )
      }
    </div>
  );
}
