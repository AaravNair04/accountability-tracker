import { getTrackedSite } from "./utils.js";
import { startSession, endSession, startBackgroundAudio, stopMissingBackgroundAudio, restoreTrackerState, checkpointCurrentSessions, syncQueuedSessions, sendHeartbeat, checkIncognitoStateChange, isTrackingPaused, pauseTracking, resumeTracking } from "./tracker.js";
console.log("Accountability Tracker background script loaded");
// --------------------------------------------------
// RECONCILIATION QUEUE
// --------------------------------------------------
// Ensures tracker updates run one after another instead of overlapping.
let reconcileQueue = Promise.resolve();
// --------------------------------------------------
// ACTIVE TAB TRACKING
// --------------------------------------------------
async function checkActiveTab() {
    // Get the most recently focused Chrome window.
    const focusedWindow = await chrome.windows.getLastFocused();
    // Stop active tracking if Chrome itself is not focused.
    if (!focusedWindow.focused) {
        await endSession();
        return;
    }
    // Get the selected tab from the focused Chrome window.
    const tabs = await chrome.tabs.query({
        active: true,
        windowId: focusedWindow.id
    });
    const activeTab = tabs[0];
    // Stop tracking if no active tab exists.
    if (!activeTab) {
        await endSession();
        return;
    }
    // Check whether the active tab belongs to a tracked site.
    const site = getTrackedSite(activeTab.url);
    if (site) {
        await startSession(site);
    }
    else {
        await endSession();
    }
}
// --------------------------------------------------
// BACKGROUND AUDIO TRACKING
// --------------------------------------------------
async function checkBackgroundAudio() {
    // Get all tabs from all Chrome windows.
    const tabs = await chrome.tabs.query({});
    // Get the most recently focused Chrome window.
    const focusedWindow = await chrome.windows.getLastFocused();
    const focusedWindowId = focusedWindow.id;
    // Store IDs of tracked tabs currently producing background audio.
    const currentlyAudibleTabIds = new Set();
    for (const tab of tabs) {
        // Skip tabs without an ID.
        if (tab.id === undefined) {
            continue;
        }
        // Check whether the tab belongs to a tracked site.
        const site = getTrackedSite(tab.url);
        if (!site) {
            continue;
        }
        // Determine whether the user is actually viewing this tab.
        const isActuallyVisible = focusedWindow.focused &&
            tab.active &&
            tab.windowId === focusedWindowId;
        // Track audible tabs that are not currently visible.
        if (tab.audible && !isActuallyVisible) {
            currentlyAudibleTabIds.add(tab.id);
            await startBackgroundAudio(tab.id, site);
        }
    }
    // End background sessions that are no longer occurring.
    await stopMissingBackgroundAudio(currentlyAudibleTabIds);
}
// --------------------------------------------------
// STATE RECONCILIATION
// --------------------------------------------------
// Recalculate the entire tracker state from the current browser state.
async function reconcileTrackerState() {
    const paused = await isTrackingPaused();
    if (paused) {
        await endSession();
        await stopMissingBackgroundAudio(new Set());
        console.log("[Tracker] Tracking is paused");
        return;
    }
    await checkActiveTab();
    await checkBackgroundAudio();
    await checkIncognitoStateChange();
}
// Add a reconciliation job to the queue.
function requestReconcile() {
    reconcileQueue = reconcileQueue
        .then(() => reconcileTrackerState())
        .catch((error) => {
        console.error("[Tracker] Reconciliation failed:", error);
    });
}
// --------------------------------------------------
// TAB SWITCH
// --------------------------------------------------
chrome.tabs.onActivated.addListener(() => {
    // Recalculate tracker state after switching tabs.
    requestReconcile();
});
// --------------------------------------------------
// TAB UPDATE
// --------------------------------------------------
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    // Ignore updates that cannot affect tracking.
    const relevantUpdate = changeInfo.audible !== undefined ||
        changeInfo.url !== undefined;
    if (!relevantUpdate) {
        return;
    }
    // Recalculate tracker state after a relevant tab change.
    requestReconcile();
});
// --------------------------------------------------
// CHROME WINDOW FOCUS
// --------------------------------------------------
chrome.windows.onFocusChanged.addListener(() => {
    // Recalculate state whenever Chrome gains or loses focus.
    requestReconcile();
});
// --------------------------------------------------
// PERIODIC SYNC
// --------------------------------------------------
const SYNC_ALARM_NAME = "sync-usage-sessions";
// Create a periodic alarm for retrying queued sessions.
chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: 5
});
const HEARTBEAT_ALARM_NAME = "device-heartbeat";
chrome.alarms.create(HEARTBEAT_ALARM_NAME, {
    periodInMinutes: 5
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name ===
        SYNC_ALARM_NAME) {
        console.log("[Tracker] Periodic checkpoint + sync triggered");
        // Save chunks from sessions that are still running.
        await checkpointCurrentSessions();
        // Upload everything waiting in the local queue.
        await syncQueuedSessions();
        return;
    }
    if (alarm.name ===
        HEARTBEAT_ALARM_NAME) {
        console.log("[Tracker] Heartbeat triggered");
        await sendHeartbeat();
    }
});
// --------------------------------------------------
// TRACKER
// --------------------------------------------------
initializeTracker().catch((error) => {
    console.error("[Tracker] Initialization failed:", error);
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type ===
        "PAUSE_TRACKING") {
        pauseTracking()
            .then(async () => {
            await reconcileTrackerState();
            sendResponse({
                success: true
            });
        });
        return true;
    }
    if (message.type ===
        "RESUME_TRACKING") {
        resumeTracking()
            .then(async () => {
            await reconcileTrackerState();
            sendResponse({
                success: true
            });
        });
        return true;
    }
    if (message.type ===
        "DEVICE_LINKED") {
        (async () => {
            try {
                const candidateToken = typeof message.token === "string"
                    ? message.token.trim()
                    : "";
                if (!/^[a-f0-9]{64}$/i.test(candidateToken)) {
                    sendResponse({
                        success: false
                    });
                    return;
                }
                const verified = await sendHeartbeat(candidateToken);
                if (!verified) {
                    sendResponse({
                        success: false
                    });
                    return;
                }
                sendResponse({
                    success: true
                });
            }
            catch (error) {
                console.error("[Tracker] Device relink verification failed:", error);
                sendResponse({
                    success: false
                });
            }
        })();
        return true;
    }
});
// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------
async function initializeTracker() {
    await restoreTrackerState();
    await reconcileTrackerState();
    await sendHeartbeat();
    console.log("[Tracker] Initialization complete");
}
