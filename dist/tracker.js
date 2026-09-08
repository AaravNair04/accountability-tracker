let activeSession = null;
const backgroundAudioSessions = new Map();
const ACTIVE_SESSION_KEY = "activeSession";
const BACKGROUND_AUDIO_KEY = "backgroundAudioSessions";
const SYNC_QUEUE_KEY = "syncQueue";
const API_URL = "http://localhost:3000/api/usage-sessions";
const HEARTBEAT_URL = "http://localhost:3000/api/devices/heartbeat";
const INCOGNITO_STATE_KEY = "lastIncognitoEnabled";
const TRACKING_PAUSED_KEY = "trackingPaused";
// --------------------------------------------------
// SAVE CURRENT ACTIVE SESSION
// --------------------------------------------------
async function saveActiveSession() {
    // Save the current active session.
    await chrome.storage.local.set({
        [ACTIVE_SESSION_KEY]: activeSession
    });
}
// --------------------------------------------------
// SAVE CURRENT BACKGROUND AUDIO SESSIONS
// --------------------------------------------------
async function saveBackgroundAudioSessions() {
    // Convert the Map into an array for storage.
    const sessions = Array.from(backgroundAudioSessions.entries());
    // Save current background-audio sessions.
    await chrome.storage.local.set({
        [BACKGROUND_AUDIO_KEY]: sessions
    });
}
// --------------------------------------------------
// ADD SESSION TO SYNC QUEUE
// --------------------------------------------------
async function addToSyncQueue(session) {
    // Get sessions waiting for upload.
    const stored = await chrome.storage.local.get(SYNC_QUEUE_KEY);
    // Use existing queue or start with an empty array.
    const queue = stored[SYNC_QUEUE_KEY] ?? [];
    // Avoid adding the same session twice.
    const alreadyQueued = queue.some(queuedSession => queuedSession.id === session.id);
    if (alreadyQueued) {
        return;
    }
    // Add the session to the queue.
    queue.push(session);
    // Save the updated queue.
    await chrome.storage.local.set({
        [SYNC_QUEUE_KEY]: queue
    });
}
// --------------------------------------------------
// SYNC QUEUE WITH BACKEND
// --------------------------------------------------
export async function syncQueuedSessions() {
    const stored = await chrome.storage.local.get([
        SYNC_QUEUE_KEY,
        "deviceToken"
    ]);
    const queue = (stored[SYNC_QUEUE_KEY] ?? []);
    const deviceToken = stored.deviceToken;
    // Do not upload until the extension is linked.
    if (!deviceToken) {
        console.log("[Tracker] Device is not linked. Sync skipped.");
        return;
    }
    if (queue.length === 0) {
        return;
    }
    const remainingSessions = [];
    for (const session of queue) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${deviceToken}`
                },
                body: JSON.stringify(session)
            });
            // Stop syncing if this device has been revoked.
            if (response.status === 401) {
                await chrome.storage.local.set({
                    backendStatus: "revoked"
                });
                console.warn("[Tracker] Sync stopped because device token is invalid or revoked.");
                remainingSessions.push(session);
                break;
            }
            if (!response.ok) {
                console.error("[Tracker] Sync failed:", response.status);
                remainingSessions.push(session);
                continue;
            }
            console.log("[Tracker] Session synced:", session.id);
        }
        catch (error) {
            console.error("[Tracker] Sync error:", error);
            remainingSessions.push(session);
        }
    }
    await chrome.storage.local.set({
        [SYNC_QUEUE_KEY]: remainingSessions
    });
}
// --------------------------------------------------
// RESTORE TRACKER STATE
// --------------------------------------------------
export async function restoreTrackerState() {
    // Load sessions saved by an earlier worker.
    const stored = await chrome.storage.local.get([
        ACTIVE_SESSION_KEY,
        BACKGROUND_AUDIO_KEY
    ]);
    const storedActiveSession = stored[ACTIVE_SESSION_KEY];
    // Restore the active session.
    if (storedActiveSession) {
        // Support sessions created before IDs were added.
        activeSession = {
            id: storedActiveSession.id ??
                crypto.randomUUID(),
            site: storedActiveSession.site,
            startTime: storedActiveSession.startTime
        };
        // Save upgraded state if necessary.
        await saveActiveSession();
        console.log("[Tracker] Restored active session:", activeSession);
    }
    const storedBackgroundSessions = stored[BACKGROUND_AUDIO_KEY];
    // Restore background-audio sessions.
    if (Array.isArray(storedBackgroundSessions)) {
        backgroundAudioSessions.clear();
        for (const [tabId, storedSession] of storedBackgroundSessions) {
            const session = storedSession;
            // Support sessions created before IDs were added.
            backgroundAudioSessions.set(Number(tabId), {
                id: session.id ??
                    crypto.randomUUID(),
                site: session.site,
                startTime: session.startTime
            });
        }
        // Save upgraded sessions if necessary.
        await saveBackgroundAudioSessions();
        console.log("[Tracker] Restored background audio sessions:", backgroundAudioSessions);
    }
    // Retry any sessions that were waiting for upload.
    await syncQueuedSessions();
}
// --------------------------------------------------
// START ACTIVE SESSION
// --------------------------------------------------
export async function startSession(site) {
    // Ignore if the same site is already active.
    if (activeSession?.site === site) {
        return;
    }
    // End the previous active session first.
    if (activeSession !== null) {
        await endSession();
    }
    const startTime = Date.now();
    // Create the session ID when the session starts.
    activeSession = {
        id: crypto.randomUUID(),
        site,
        startTime
    };
    console.log(`[Tracker] ACTIVE ${site} started at`, new Date(startTime).toLocaleTimeString());
    // Persist the current active session.
    await saveActiveSession();
}
// --------------------------------------------------
// END ACTIVE SESSION
// --------------------------------------------------
export async function endSession() {
    // Ignore if no active session exists.
    if (activeSession === null) {
        return;
    }
    const endTime = Date.now();
    // Create a completed active session.
    const completedSession = {
        // Reuse the ID created when the session started.
        id: activeSession.id,
        site: activeSession.site,
        type: "active",
        startTime: activeSession.startTime,
        endTime,
        durationSeconds: Math.floor((endTime -
            activeSession.startTime) / 1000)
    };
    // Add the session to the sync queue.
    await addToSyncQueue(completedSession);
    console.log("[Tracker] Completed session:", completedSession);
    // Clear the current active session.
    activeSession = null;
    // Persist the cleared active state.
    await saveActiveSession();
    // Try to upload queued sessions.
    await syncQueuedSessions();
}
// --------------------------------------------------
// START BACKGROUND AUDIO
// --------------------------------------------------
export async function startBackgroundAudio(tabId, site) {
    // Check whether this tab already has a session.
    const existingSession = backgroundAudioSessions.get(tabId);
    // Ignore if the same site is already tracked.
    if (existingSession &&
        existingSession.site === site) {
        return;
    }
    // End the previous session for this tab.
    if (existingSession) {
        await endBackgroundAudio(tabId);
    }
    const startTime = Date.now();
    // Create the session ID when background tracking starts.
    backgroundAudioSessions.set(tabId, {
        id: crypto.randomUUID(),
        site,
        startTime
    });
    console.log(`[Tracker] BACKGROUND AUDIO ${site} started on tab ${tabId} at`, new Date(startTime).toLocaleTimeString());
    // Persist the current background state.
    await saveBackgroundAudioSessions();
}
// --------------------------------------------------
// END BACKGROUND AUDIO
// --------------------------------------------------
export async function endBackgroundAudio(tabId) {
    // Get the current session for this tab.
    const session = backgroundAudioSessions.get(tabId);
    if (!session) {
        return;
    }
    const endTime = Date.now();
    // Create a completed background-audio session.
    const completedSession = {
        // Reuse the ID created when tracking started.
        id: session.id,
        site: session.site,
        type: "background_audio",
        startTime: session.startTime,
        endTime,
        durationSeconds: Math.floor((endTime -
            session.startTime) / 1000)
    };
    // Add the session to the sync queue.
    await addToSyncQueue(completedSession);
    console.log("[Tracker] Completed session:", completedSession);
    // Remove the session from current state.
    backgroundAudioSessions.delete(tabId);
    // Persist the updated background state.
    await saveBackgroundAudioSessions();
    // Try to upload queued sessions.
    await syncQueuedSessions();
}
// --------------------------------------------------
// REMOVE INACTIVE BACKGROUND SESSIONS
// --------------------------------------------------
export async function stopMissingBackgroundAudio(currentlyAudibleTabIds) {
    // Copy IDs before modifying the Map.
    const existingTabIds = Array.from(backgroundAudioSessions.keys());
    // End sessions that are no longer audible.
    for (const tabId of existingTabIds) {
        if (!currentlyAudibleTabIds.has(tabId)) {
            await endBackgroundAudio(tabId);
        }
    }
}
// --------------------------------------------------
// CHECKPOINT CURRENT SESSIONS
// --------------------------------------------------
export async function checkpointCurrentSessions() {
    // Do not create usage chunks while tracking is paused.
    const paused = await isTrackingPaused();
    if (paused) {
        return;
    }
    const checkpointTime = Date.now();
    let activeChanged = false;
    let backgroundChanged = false;
    // --------------------------------------------------
    // ACTIVE SESSION
    // --------------------------------------------------
    if (activeSession) {
        const durationSeconds = Math.floor((checkpointTime -
            activeSession.startTime) / 1000);
        // Avoid zero-second sessions.
        if (durationSeconds > 0) {
            const completedSession = {
                id: activeSession.id,
                site: activeSession.site,
                type: "active",
                startTime: activeSession.startTime,
                endTime: checkpointTime,
                durationSeconds
            };
            await addToSyncQueue(completedSession);
            // Immediately start a new chunk for the same site.
            activeSession = {
                id: crypto.randomUUID(),
                site: activeSession.site,
                startTime: checkpointTime
            };
            activeChanged =
                true;
            console.log("[Tracker] Active session checkpointed:", completedSession);
        }
    }
    // --------------------------------------------------
    // BACKGROUND AUDIO SESSIONS
    // --------------------------------------------------
    for (const [tabId, session] of Array.from(backgroundAudioSessions.entries())) {
        const durationSeconds = Math.floor((checkpointTime -
            session.startTime) / 1000);
        if (durationSeconds <= 0) {
            continue;
        }
        const completedSession = {
            id: session.id,
            site: session.site,
            type: "background_audio",
            startTime: session.startTime,
            endTime: checkpointTime,
            durationSeconds
        };
        await addToSyncQueue(completedSession);
        // Continue tracking the same audible tab with a new chunk.
        backgroundAudioSessions.set(tabId, {
            id: crypto.randomUUID(),
            site: session.site,
            startTime: checkpointTime
        });
        backgroundChanged =
            true;
        console.log("[Tracker] Background session checkpointed:", completedSession);
    }
    // Persist the newly started active chunk.
    if (activeChanged) {
        await saveActiveSession();
    }
    // Persist newly started background chunks.
    if (backgroundChanged) {
        await saveBackgroundAudioSessions();
    }
}
// --------------------------------------------------
// SEND HEARTBEAT TO BACKEND
// --------------------------------------------------
export async function sendHeartbeat(tokenOverride) {
    const stored = await chrome.storage.local.get("deviceToken");
    const storedDeviceToken = stored.deviceToken;
    const deviceToken = tokenOverride ??
        storedDeviceToken;
    if (!deviceToken) {
        await chrome.storage.local.set({
            backendStatus: "unlinked"
        });
        console.log("[Tracker] Heartbeat skipped. Device not linked.");
        return false;
    }
    let incognitoEnabled = false;
    try {
        incognitoEnabled =
            await chrome.extension
                .isAllowedIncognitoAccess();
    }
    catch (error) {
        console.error("[Tracker] Could not check incognito access:", error);
    }
    const requestBody = {
        incognitoEnabled
    };
    try {
        const response = await fetch(HEARTBEAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${deviceToken}`
            },
            body: JSON.stringify(requestBody)
        });
        // Revoked or invalid device token.
        if (response.status === 401) {
            await chrome.storage.local.set({
                backendStatus: "revoked"
            });
            console.warn("[Tracker] Device token is invalid or revoked.");
            return false;
        }
        // Backend responded, but with another error.
        if (!response.ok) {
            await chrome.storage.local.set({
                backendStatus: "offline"
            });
            const responseText = await response.text();
            console.error("[Tracker] Heartbeat failed:", response.status, responseText);
            return false;
        }
        await chrome.storage.local.set({
            backendStatus: "connected",
            lastBackendSuccess: Date.now()
        });
        console.log("[Tracker] Heartbeat sent");
        return true;
    }
    catch (error) {
        await chrome.storage.local.set({
            backendStatus: "offline"
        });
        console.error("[Tracker] Heartbeat fetch failed:", error);
        return false;
    }
}
// --------------------------------------------------
// Check whether incognito permission changed
// --------------------------------------------------
export async function checkIncognitoStateChange() {
    let incognitoEnabled = false;
    try {
        incognitoEnabled =
            await chrome.extension
                .isAllowedIncognitoAccess();
    }
    catch (error) {
        console.error("[Tracker] Could not check incognito access:", error);
        return;
    }
    const stored = await chrome.storage.local.get(INCOGNITO_STATE_KEY);
    const previousState = stored[INCOGNITO_STATE_KEY];
    // Save the first observed state.
    if (previousState ===
        undefined) {
        await chrome.storage.local.set({
            [INCOGNITO_STATE_KEY]: incognitoEnabled
        });
        return;
    }
    // Ignore unchanged state.
    if (previousState ===
        incognitoEnabled) {
        return;
    }
    console.log("[Tracker] Incognito permission changed:", previousState, "→", incognitoEnabled);
    await chrome.storage.local.set({
        [INCOGNITO_STATE_KEY]: incognitoEnabled
    });
    // Record the new integrity state immediately.
    await sendHeartbeat();
}
// --------------------------------------------------
// PAUSE/RESUME TRACKER
// --------------------------------------------------
// Check whether tracking is paused.
export async function isTrackingPaused() {
    const stored = await chrome.storage.local.get(TRACKING_PAUSED_KEY);
    return (stored[TRACKING_PAUSED_KEY] === true);
}
// Pause tracking.
export async function pauseTracking() {
    await chrome.storage.local.set({
        [TRACKING_PAUSED_KEY]: true
    });
    await sendTrackingEvent("tracking_paused");
    console.log("[Tracker] Tracking paused");
}
// Resume tracking.
export async function resumeTracking() {
    await chrome.storage.local.set({
        [TRACKING_PAUSED_KEY]: false
    });
    await sendTrackingEvent("tracking_resumed");
    console.log("[Tracker] Tracking resumed");
}
// --------------------------------------------------
// Send an integrity event to the backend
// --------------------------------------------------
async function sendTrackingEvent(type) {
    const stored = await chrome.storage.local.get("deviceToken");
    const deviceToken = stored.deviceToken;
    if (!deviceToken) {
        return;
    }
    try {
        await fetch(HEARTBEAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${deviceToken}`
            },
            body: JSON.stringify({
                eventType: type
            })
        });
    }
    catch (error) {
        console.error("[Tracker] Tracking event failed:", error);
    }
}
