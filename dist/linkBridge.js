"use strict";
// --------------------------------------------------
// WEB PAGE → EXTENSION TOKEN BRIDGE
// --------------------------------------------------
window.addEventListener("message", async (event) => {
    // Only accept messages from this page.
    if (event.source !== window) {
        return;
    }
    // Only accept messages from our local web app.
    if (event.origin !==
        "http://localhost:3000") {
        return;
    }
    const data = event.data;
    if (!data ||
        data.source !==
            "accountability-web" ||
        data.type !==
            "ACCOUNTABILITY_DEVICE_TOKEN" ||
        typeof data.token !==
            "string") {
        return;
    }
    const token = data.token.trim();
    // Device tokens are 32 random bytes encoded as hex.
    if (!/^[a-f0-9]{64}$/i.test(token)) {
        console.warn("[Link Bridge] Invalid device token received.");
        return;
    }
    try {
        // Keep the current working token untouched
        // until the new token is verified.
        await chrome.storage.local.set({
            pendingDeviceToken: token,
            backendStatus: "checking"
        });
        console.log("[Link Bridge] New device token received. Verifying...");
        const response = await chrome.runtime.sendMessage({
            type: "DEVICE_LINKED",
            token
        });
        if (!response?.success) {
            console.warn("[Link Bridge] Device verification failed.");
            // Remove only the temporary token.
            await chrome.storage.local.remove("pendingDeviceToken");
            /*
              Preserve the previous device token if one
              already exists.
            */
            const stored = await chrome.storage.local.get("deviceToken");
            await chrome.storage.local.set({
                backendStatus: stored.deviceToken
                    ? "connected"
                    : "unlinked"
            });
            window.postMessage({
                source: "accountability-extension",
                type: "ACCOUNTABILITY_DEVICE_LINK_FAILED"
            }, window.location.origin);
            return;
        }
        // --------------------------------------------------
        // NEW TOKEN VERIFIED
        // --------------------------------------------------
        /*
          Only now replace the old working token.
        */
        await chrome.storage.local.set({
            deviceToken: token,
            backendStatus: "connected",
            lastBackendSuccess: Date.now()
        });
        await chrome.storage.local.remove("pendingDeviceToken");
        console.log("[Link Bridge] Device verified successfully.");
        window.postMessage({
            source: "accountability-extension",
            type: "ACCOUNTABILITY_DEVICE_LINKED"
        }, window.location.origin);
    }
    catch (error) {
        console.error("[Link Bridge] Failed to link device:", error);
        // Remove only the temporary token.
        await chrome.storage.local.remove("pendingDeviceToken");
        const stored = await chrome.storage.local.get("deviceToken");
        await chrome.storage.local.set({
            backendStatus: stored.deviceToken
                ? "connected"
                : "unlinked"
        });
        window.postMessage({
            source: "accountability-extension",
            type: "ACCOUNTABILITY_DEVICE_LINK_FAILED"
        }, window.location.origin);
    }
});
