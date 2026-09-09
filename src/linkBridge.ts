// --------------------------------------------------
// WEB PAGE -> EXTENSION TOKEN BRIDGE
// --------------------------------------------------

window.addEventListener(
  "message",
  async (
    event: MessageEvent
  ) => {
    if (
      event.source !==
      window
    ) {
      return;
    }

    if (
      event.origin !==
      "https://accountability-tracker-eosin.vercel.app"
    ) {
      return;
    }

    const data =
      event.data;

    if (
      !data ||
      data.source !==
        "accountability-web" ||
      data.type !==
        "ACCOUNTABILITY_DEVICE_TOKEN" ||
      typeof data.token !==
        "string"
    ) {
      return;
    }

    const token =
      data.token.trim();

    if (
      !/^[a-f0-9]{64}$/i.test(
        token
      )
    ) {
      console.warn(
        "[Link Bridge] Invalid device token received."
      );

      return;
    }

    /*
      Preserve the exact previous status.
      A stored token may itself be revoked, so
      token existence must never imply Connected.
    */
    const previousState =
      await chrome.storage.local.get([
        "deviceToken",
        "linkedDeviceId",
        "backendStatus",
        "lastBackendSuccess"
      ]);

    const previousBackendStatus =
      previousState.backendStatus;

    try {
      await chrome.storage.local.set({
        pendingDeviceToken:
          token,

        backendStatus:
          "checking"
      });

      const response =
        await chrome.runtime.sendMessage({
          type:
            "DEVICE_LINKED",

          token
        });

      if (
        !response?.success ||
        typeof response.deviceId !==
          "string"
      ) {
        await chrome.storage.local.remove(
          "pendingDeviceToken"
        );

        await chrome.storage.local.set({
          backendStatus:
            previousBackendStatus ??
            (
              previousState.deviceToken
                ? "checking"
                : "unlinked"
            )
        });

        window.postMessage(
          {
            source:
              "accountability-extension",

            type:
              "ACCOUNTABILITY_DEVICE_LINK_FAILED"
          },
          window.location.origin
        );

        return;
      }

      /*
        Promote the candidate only after the backend
        verified the token and returned its device ID.
      */
      await chrome.storage.local.set({
        deviceToken:
          token,

        linkedDeviceId:
          response.deviceId,

        backendStatus:
          "connected",

        lastBackendSuccess:
          Date.now()
      });

      await chrome.storage.local.remove(
        "pendingDeviceToken"
      );

      /*
        The link itself is complete now, so tell the
        page immediately. Queue synchronization can
        continue in the background.
      */
      window.postMessage(
        {
          source:
            "accountability-extension",

          type:
            "ACCOUNTABILITY_DEVICE_LINKED"
        },
        window.location.origin
      );

      chrome.runtime.sendMessage({
        type:
          "DEVICE_LINK_COMMITTED"
      }).catch(
        (error) => {
          console.error(
            "[Link Bridge] Post-link sync failed:",
            error
          );
        }
      );

    } catch (error) {
      console.error(
        "[Link Bridge] Failed to link device:",
        error
      );

      await chrome.storage.local.remove(
        "pendingDeviceToken"
      );

      await chrome.storage.local.set({
        backendStatus:
          previousBackendStatus ??
          (
            previousState.deviceToken
              ? "checking"
              : "unlinked"
          )
      });

      window.postMessage(
        {
          source:
            "accountability-extension",

          type:
            "ACCOUNTABILITY_DEVICE_LINK_FAILED"
        },
        window.location.origin
      );
    }
  }
);
