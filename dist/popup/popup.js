"use strict";
const deviceStatus = document.getElementById("deviceStatus");
const trackingStatus = document.getElementById("trackingStatus");
const trackingDot = document.getElementById("trackingDot");
const backendStatus = document.getElementById("backendStatus");
const backendDot = document.getElementById("backendDot");
const syncMessage = document.getElementById("syncMessage");
const trackingToggle = document.getElementById("trackingToggle");
const linkDeviceButton = document.getElementById("linkDeviceButton");
// --------------------------------------------------
// DEVICE STATUS
// --------------------------------------------------
async function loadDeviceStatus() {
    const stored = await chrome.storage.local.get([
        "deviceToken",
        "backendStatus"
    ]);
    const deviceToken = stored.deviceToken;
    const status = stored.backendStatus;
    // Revoked device.
    if (status ===
        "revoked") {
        deviceStatus.textContent =
            "Revoked";
        linkDeviceButton.textContent =
            "Relink Device";
        linkDeviceButton.style.display =
            "block";
        return;
    }
    // No device token exists.
    if (!deviceToken) {
        deviceStatus.textContent =
            "Not linked";
        linkDeviceButton.textContent =
            "Link Device";
        linkDeviceButton.style.display =
            "block";
        return;
    }
    // A token exists locally.
    deviceStatus.textContent =
        "Linked";
    linkDeviceButton.style.display =
        "none";
}
// --------------------------------------------------
// TRACKING STATUS
// --------------------------------------------------
async function loadTrackingStatus() {
    const stored = await chrome.storage.local.get("trackingPaused");
    const isPaused = stored.trackingPaused === true;
    trackingStatus.textContent =
        isPaused
            ? "Paused"
            : "Active";
    trackingToggle.textContent =
        isPaused
            ? "Resume Tracking"
            : "Pause Tracking";
    trackingDot.classList.remove("active", "paused");
    trackingDot.classList.add(isPaused
        ? "paused"
        : "active");
}
// --------------------------------------------------
// BACKEND STATUS
// --------------------------------------------------
async function loadBackendStatus() {
    const stored = await chrome.storage.local.get([
        "backendStatus",
        "lastBackendSuccess"
    ]);
    const status = stored.backendStatus;
    backendDot.classList.remove("connected", "offline");
    // ------------------------------------------------
    // CONNECTED
    // ------------------------------------------------
    if (status ===
        "connected") {
        backendStatus.textContent =
            "Connected";
        backendDot.classList.add("connected");
        const lastSuccess = stored.lastBackendSuccess;
        if (lastSuccess) {
            syncMessage.textContent =
                `Last successful connection: ${new Date(lastSuccess).toLocaleTimeString()}`;
        }
        else {
            syncMessage.textContent =
                "";
        }
        return;
    }
    // ------------------------------------------------
    // OFFLINE
    // ------------------------------------------------
    if (status ===
        "offline") {
        backendStatus.textContent =
            "Offline";
        backendDot.classList.add("offline");
        syncMessage.textContent =
            "Usage will be queued and retried.";
        return;
    }
    // ------------------------------------------------
    // REVOKED
    // ------------------------------------------------
    if (status ===
        "revoked") {
        backendStatus.textContent =
            "Needs relinking";
        backendDot.classList.add("offline");
        syncMessage.textContent =
            "This device was revoked. Relink it to resume syncing.";
        return;
    }
    // ------------------------------------------------
    // UNLINKED
    // ------------------------------------------------
    if (status ===
        "unlinked") {
        backendStatus.textContent =
            "Not linked";
        backendDot.classList.add("offline");
        syncMessage.textContent =
            "Link this device before syncing.";
        return;
    }
    // ------------------------------------------------
    // CHECKING
    // ------------------------------------------------
    if (status ===
        "checking") {
        backendStatus.textContent =
            "Checking...";
        syncMessage.textContent =
            "Verifying backend connection...";
        return;
    }
    // ------------------------------------------------
    // UNKNOWN / INITIAL STATE
    // ------------------------------------------------
    backendStatus.textContent =
        "Checking...";
    syncMessage.textContent =
        "";
}
// --------------------------------------------------
// PAUSE / RESUME TRACKING
// --------------------------------------------------
trackingToggle.addEventListener("click", async () => {
    trackingToggle.disabled =
        true;
    try {
        const stored = await chrome.storage.local.get("trackingPaused");
        const isPaused = stored.trackingPaused === true;
        const response = await chrome.runtime.sendMessage({
            type: isPaused
                ? "RESUME_TRACKING"
                : "PAUSE_TRACKING"
        });
        if (!response?.success) {
            console.error("[Popup] Tracking toggle failed.");
            return;
        }
        await loadTrackingStatus();
    }
    catch (error) {
        console.error("[Popup] Tracking toggle failed:", error);
    }
    finally {
        trackingToggle.disabled =
            false;
    }
});
// --------------------------------------------------
// LINK / RELINK DEVICE
// --------------------------------------------------
linkDeviceButton.addEventListener("click", async () => {
    linkDeviceButton.disabled =
        true;
    try {
        await chrome.tabs.create({
            url: "http://localhost:3000/devices/link"
        });
        window.close();
    }
    catch (error) {
        console.error("[Popup] Failed to open device linking page:", error);
        linkDeviceButton.disabled =
            false;
    }
});
// --------------------------------------------------
// REFRESH WHEN STORAGE CHANGES
// --------------------------------------------------
chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !==
        "local") {
        return;
    }
    const shouldRefreshDevice = Boolean(changes.deviceToken ||
        changes.backendStatus);
    const shouldRefreshTracking = Boolean(changes.trackingPaused);
    const shouldRefreshBackend = Boolean(changes.backendStatus ||
        changes.lastBackendSuccess);
    try {
        if (shouldRefreshDevice) {
            await loadDeviceStatus();
        }
        if (shouldRefreshTracking) {
            await loadTrackingStatus();
        }
        if (shouldRefreshBackend) {
            await loadBackendStatus();
        }
    }
    catch (error) {
        console.error("[Popup] Failed to refresh status:", error);
    }
});
// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------
async function initializePopup() {
    await Promise.all([
        loadDeviceStatus(),
        loadTrackingStatus(),
        loadBackendStatus()
    ]);
}
initializePopup().catch((error) => {
    console.error("[Popup] Initialization failed:", error);
});
