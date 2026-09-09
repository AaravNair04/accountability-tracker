import {
  getTrackedSite
} from "./utils.js";

import {
  startSession,
  endSession,
  startBackgroundAudio,
  stopMissingBackgroundAudio,
  restoreTrackerState,
  checkpointCurrentSessions,
  syncQueuedSessions,
  sendHeartbeat,
  checkIncognitoStateChange,
  isTrackingPaused,
  pauseTracking,
  resumeTracking
} from "./tracker.js";


console.log(
  "Accountability Tracker background script loaded"
);


// --------------------------------------------------
// RECONCILIATION QUEUE
// --------------------------------------------------

let reconcileQueue:
  Promise<void> =
    Promise.resolve();


function requestReconcile() {
  reconcileQueue =
    reconcileQueue
      .then(
        () =>
          reconcileTrackerState()
      )
      .catch(
        (error) => {
          console.error(
            "[Tracker] Reconciliation failed:",
            error
          );
        }
      );
}


// --------------------------------------------------
// ACTIVE TAB
// --------------------------------------------------

async function checkActiveTab() {
  const focusedWindow =
    await chrome.windows
      .getLastFocused();

  if (
    !focusedWindow.focused ||
    focusedWindow.id ===
      undefined
  ) {
    await endSession();
    return;
  }

  const tabs =
    await chrome.tabs.query({
      active:
        true,

      windowId:
        focusedWindow.id
    });

  const activeTab =
    tabs[0];

  if (
    !activeTab
  ) {
    await endSession();
    return;
  }

  const site =
    getTrackedSite(
      activeTab.url
    );

  if (
    site
  ) {
    await startSession(
      site
    );
  } else {
    await endSession();
  }
}


// --------------------------------------------------
// BACKGROUND AUDIO
// --------------------------------------------------

async function checkBackgroundAudio() {
  const tabs =
    await chrome.tabs.query(
      {}
    );

  const focusedWindow =
    await chrome.windows
      .getLastFocused();

  const focusedWindowId =
    focusedWindow.id;

  const currentlyAudibleTabIds =
    new Set<number>();

  for (
    const tab
    of tabs
  ) {
    if (
      tab.id ===
      undefined
    ) {
      continue;
    }

    const site =
      getTrackedSite(
        tab.url
      );

    if (
      !site
    ) {
      continue;
    }

    const isActuallyVisible =
      focusedWindow.focused &&
      tab.active &&
      tab.windowId ===
        focusedWindowId;

    if (
      tab.audible &&
      !isActuallyVisible
    ) {
      currentlyAudibleTabIds.add(
        tab.id
      );

      await startBackgroundAudio(
        tab.id,
        site
      );
    }
  }

  await stopMissingBackgroundAudio(
    currentlyAudibleTabIds
  );
}


// --------------------------------------------------
// FULL RECONCILIATION
// --------------------------------------------------

async function reconcileTrackerState() {
  if (
    await isTrackingPaused()
  ) {
    await endSession();

    await stopMissingBackgroundAudio(
      new Set<number>()
    );

    return;
  }

  await checkActiveTab();

  await checkBackgroundAudio();

  await checkIncognitoStateChange();
}


// --------------------------------------------------
// BROWSER EVENTS
// --------------------------------------------------

chrome.tabs.onActivated.addListener(
  () => {
    requestReconcile();
  }
);


chrome.tabs.onUpdated.addListener(
  (
    _tabId,
    changeInfo
  ) => {
    const relevantUpdate =
      changeInfo.audible !==
        undefined ||
      changeInfo.url !==
        undefined;

    if (
      relevantUpdate
    ) {
      requestReconcile();
    }
  }
);


/*
  Important for background-audio sessions:
  closing an audible tab must immediately end it.
*/
chrome.tabs.onRemoved.addListener(
  () => {
    requestReconcile();
  }
);


chrome.windows.onFocusChanged.addListener(
  () => {
    requestReconcile();
  }
);


// --------------------------------------------------
// PERIODIC JOBS
// --------------------------------------------------

const SYNC_ALARM_NAME =
  "sync-usage-sessions";

const HEARTBEAT_ALARM_NAME =
  "device-heartbeat";


chrome.alarms.create(
  SYNC_ALARM_NAME,
  {
    periodInMinutes:
      5
  }
);


chrome.alarms.create(
  HEARTBEAT_ALARM_NAME,
  {
    periodInMinutes:
      5
  }
);


chrome.alarms.onAlarm.addListener(
  async (
    alarm
  ) => {
    if (
      alarm.name ===
      SYNC_ALARM_NAME
    ) {
      await checkpointCurrentSessions();

      await syncQueuedSessions();

      return;
    }

    if (
      alarm.name ===
      HEARTBEAT_ALARM_NAME
    ) {
      await sendHeartbeat();
    }
  }
);


// --------------------------------------------------
// MESSAGES
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    if (
      message.type ===
      "PAUSE_TRACKING"
    ) {
      (
        async () => {
          try {
            await pauseTracking();

            await reconcileTrackerState();

            sendResponse({
              success:
                true
            });
          } catch (error) {
            console.error(
              "[Tracker] Pause failed:",
              error
            );

            sendResponse({
              success:
                false
            });
          }
        }
      )();

      return true;
    }


    if (
      message.type ===
      "RESUME_TRACKING"
    ) {
      (
        async () => {
          try {
            await resumeTracking();

            await reconcileTrackerState();

            sendResponse({
              success:
                true
            });
          } catch (error) {
            console.error(
              "[Tracker] Resume failed:",
              error
            );

            sendResponse({
              success:
                false
            });
          }
        }
      )();

      return true;
    }


    /*
      Verify a candidate token without replacing
      the currently working token first.
    */
    if (
      message.type ===
      "DEVICE_LINKED"
    ) {
      (
        async () => {
          try {
            const candidateToken =
              typeof message.token ===
                "string"
                ? message.token.trim()
                : "";

            if (
              !/^[a-f0-9]{64}$/i.test(
                candidateToken
              )
            ) {
              sendResponse({
                success:
                  false
              });

              return;
            }

            const result =
              await sendHeartbeat(
                candidateToken
              );

            if (
              !result.success ||
              !result.deviceId
            ) {
              sendResponse({
                success:
                  false
              });

              return;
            }

            sendResponse({
              success:
                true,

              deviceId:
                result.deviceId
            });

          } catch (error) {
            console.error(
              "[Tracker] Candidate device verification failed:",
              error
            );

            sendResponse({
              success:
                false
            });
          }
        }
      )();

      return true;
    }


    /*
      The content script sends this only after
      the verified token has been promoted to
      the real local deviceToken.
    */
    if (
      message.type ===
      "DEVICE_LINK_COMMITTED"
    ) {
      (
        async () => {
          try {
            /*
              Split any still-running session at the
              relink boundary. The completed chunk
              keeps its original deviceId; the new
              chunk uses the newly linked device.
            */
            await checkpointCurrentSessions();

            await syncQueuedSessions();

            await sendHeartbeat();

            sendResponse({
              success:
                true
            });

          } catch (error) {
            console.error(
              "[Tracker] Post-link sync failed:",
              error
            );

            sendResponse({
              success:
                false
            });
          }
        }
      )();

      return true;
    }
  }
);


// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

async function initializeTracker() {
  await restoreTrackerState();

  /*
    A normal heartbeat also backfills
    linkedDeviceId for older installations.
  */
  await sendHeartbeat();

  await reconcileTrackerState();

  console.log(
    "[Tracker] Initialization complete"
  );
}


initializeTracker().catch(
  (error) => {
    console.error(
      "[Tracker] Initialization failed:",
      error
    );
  }
);