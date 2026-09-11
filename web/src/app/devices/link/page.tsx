"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";


type DeviceResponse = {
  success?: boolean;

  device?: {
    id: string;
    name: string;
    token: string;
  };

  error?: string;
};


export default function DeviceLinkPage() {

  const [
    status,
    setStatus
  ] =
    useState(
      "Ready to link this browser extension."
    );


  const [
    loading,
    setLoading
  ] =
    useState(false);


  const [
    linked,
    setLinked
  ] =
    useState(false);


  const timeoutRef =
    useRef<number | null>(
      null
    );


  useEffect(
    () => {

      function clearLinkTimeout() {

        if (
          timeoutRef.current !== null
        ) {

          window.clearTimeout(
            timeoutRef.current
          );


          timeoutRef.current =
            null;
        }
      }


      function handleExtensionMessage(
        event: MessageEvent
      ) {

        if (
          event.source !== window
        ) {
          return;
        }


        if (
          event.origin !==
          window.location.origin
        ) {
          return;
        }


        const data =
          event.data;


        if (
          !data ||
          data.source !==
            "accountability-extension"
        ) {
          return;
        }


        // ------------------------------------------
        // LINK SUCCESS
        // ------------------------------------------

        if (
          data.type ===
          "ACCOUNTABILITY_DEVICE_LINKED"
        ) {

          clearLinkTimeout();


          setLinked(
            true
          );


          setLoading(
            false
          );


          setStatus(
            "Extension linked successfully."
          );


          return;
        }


        // ------------------------------------------
        // LINK FAILED
        // ------------------------------------------

        if (
          data.type ===
          "ACCOUNTABILITY_DEVICE_LINK_FAILED"
        ) {

          clearLinkTimeout();


          setLinked(
            false
          );


          setLoading(
            false
          );


          setStatus(
            "The extension received the token, but backend verification failed."
          );
        }
      }


      window.addEventListener(
        "message",
        handleExtensionMessage
      );


      return () => {

        clearLinkTimeout();


        window.removeEventListener(
          "message",
          handleExtensionMessage
        );

      };

    },
    []
  );


  async function linkDevice() {

    if (loading) {
      return;
    }


    setLoading(
      true
    );


    setLinked(
      false
    );


    setStatus(
      "Creating device..."
    );


    try {

      const response =
        await fetch(
          "/api/devices",
          {
            method:
              "POST"
          }
        );


      const responseText =
        await response.text();


      let data:
        DeviceResponse = {};


      try {

        data =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};

      } catch {

        throw new Error(
          "Server returned an invalid response."
        );
      }


      if (
        !response.ok ||
        !data.device?.token
      ) {

        setStatus(
          data.error ??
          "Failed to create device."
        );


        setLoading(
          false
        );


        return;
      }


      const token =
        data.device.token;


      setStatus(
        "Device created. Waiting for extension verification..."
      );


      window.postMessage(
        {
          source:
            "accountability-web",

          type:
            "ACCOUNTABILITY_DEVICE_TOKEN",

          token
        },
        window.location.origin
      );


      timeoutRef.current =
        window.setTimeout(
          () => {

            setLoading(
              false
            );


            setLinked(
              false
            );


            setStatus(
              "No response from the extension. Make sure the extension is installed, enabled, and reloaded."
            );


            timeoutRef.current =
              null;

          },
          5000
        );

    } catch (error) {

      console.error(
        "[Link] Device linking failed:",
        error
      );


      setLoading(
        false
      );


      setLinked(
        false
      );


      setStatus(
        error instanceof Error
          ? error.message
          : "Could not link device."
      );
    }
  }


  return (
    <main className="app-page-narrow max-w-2xl space-y-6">

      <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
        Link Accountability Tracker
      </h1>


      <p>
        Connect this Chrome extension
        to your logged-in accountability account.
      </p>


      <button
        type="button"
        onClick={
          linkDevice
        }
        disabled={
          loading ||
          linked
        }
        className="app-button-primary"
      >
        {
          linked
            ? "Linked"
            : loading
              ? "Linking..."
              : "Link Device"
        }
      </button>


      <p>
        {status}
      </p>

    </main>
  );
}
