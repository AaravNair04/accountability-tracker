import {
  setTrackedSites
} from "./utils.js";


type SessionState = {
  id: string;
  site: string;
  startTime: number;
  deviceId?: string;
};

type UsageSession = {
  id: string;
  site: string;
  type: "active" | "background_audio";
  startTime: number;
  endTime: number;
  durationSeconds: number;
  deviceId?: string;
};

type HeartbeatApiResponse = {
  success?: boolean;
  deviceId?: string;
};

type TrackedSitesApiResponse = {
  success?: boolean;
  trackedSites?: {
    hostname?: unknown;
    site?: unknown;
  }[];
};

export type HeartbeatResult = {
  success: boolean;
  deviceId?: string;
};

const ACTIVE_SESSION_KEY =
  "activeSession";

const BACKGROUND_AUDIO_KEY =
  "backgroundAudioSessions";

const SYNC_QUEUE_KEY =
  "syncQueue";

const DEVICE_TOKEN_KEY =
  "deviceToken";

const LINKED_DEVICE_ID_KEY =
  "linkedDeviceId";

const INCOGNITO_STATE_KEY =
  "lastIncognitoEnabled";

const TRACKING_PAUSED_KEY =
  "trackingPaused";

const API_URL =
  "https://accountability-tracker-eosin.vercel.app/api/usage-sessions";

const HEARTBEAT_URL =
  "https://accountability-tracker-eosin.vercel.app/api/devices/heartbeat"

const TRACKED_SITES_URL =
  "https://accountability-tracker-eosin.vercel.app/api/tracked-sites";

let activeSession:
  SessionState | null =
    null;

const backgroundAudioSessions =
  new Map<number, SessionState>();


// --------------------------------------------------
// STORAGE HELPERS
// --------------------------------------------------

async function saveActiveSession() {
  await chrome.storage.local.set({
    [ACTIVE_SESSION_KEY]:
      activeSession
  });
}


async function saveBackgroundAudioSessions() {
  await chrome.storage.local.set({
    [BACKGROUND_AUDIO_KEY]:
      Array.from(
        backgroundAudioSessions.entries()
      )
  });
}


async function getLinkedDeviceId() {
  const stored =
    await chrome.storage.local.get(
      LINKED_DEVICE_ID_KEY
    );

  const value =
    stored[
      LINKED_DEVICE_ID_KEY
    ];

  return typeof value ===
    "string"
      ? value
      : undefined;
}


async function addToSyncQueue(
  session: UsageSession
) {
  const stored =
    await chrome.storage.local.get(
      SYNC_QUEUE_KEY
    );

  const queue =
    (
      stored[
        SYNC_QUEUE_KEY
      ] as UsageSession[] | undefined
    ) ?? [];

  if (
    queue.some(
      (queuedSession) =>
        queuedSession.id ===
        session.id
    )
  ) {
    return;
  }

  queue.push(
    session
  );

  await chrome.storage.local.set({
    [SYNC_QUEUE_KEY]:
      queue
  });
}


// --------------------------------------------------
// SYNC QUEUE
// --------------------------------------------------

export async function syncQueuedSessions() {
  const stored =
    await chrome.storage.local.get([
      SYNC_QUEUE_KEY,
      DEVICE_TOKEN_KEY
    ]);

  const queue =
    (
      stored[
        SYNC_QUEUE_KEY
      ] as UsageSession[] | undefined
    ) ?? [];

  const deviceToken =
    stored[
      DEVICE_TOKEN_KEY
    ] as string | undefined;

  if (!deviceToken) {
    console.log(
      "[Tracker] Device is not linked. Sync skipped."
    );
    return;
  }

  if (
    queue.length === 0
  ) {
    return;
  }

  const remainingSessions:
    UsageSession[] = [];

  for (
    let index = 0;
    index < queue.length;
    index++
  ) {
    const session =
      queue[index];

    try {
      const response =
        await fetch(
          API_URL,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${deviceToken}`
            },

            body:
              JSON.stringify(
                session
              )
          }
        );

      if (
        response.status ===
        401
      ) {
        await chrome.storage.local.set({
          backendStatus:
            "revoked"
        });

        /*
          Preserve the current session AND every
          session that has not been attempted yet.
        */
        remainingSessions.push(
          ...queue.slice(
            index
          )
        );

        console.warn(
          "[Tracker] Sync stopped because the device token is invalid or revoked."
        );

        break;
      }

      if (
        !response.ok
      ) {
        remainingSessions.push(
          session
        );

        console.error(
          "[Tracker] Sync failed:",
          response.status
        );

        continue;
      }

      console.log(
        "[Tracker] Session synced:",
        session.id
      );

    } catch (error) {
      remainingSessions.push(
        session
      );

      console.error(
        "[Tracker] Sync error:",
        error
      );
    }
  }

  await chrome.storage.local.set({
    [SYNC_QUEUE_KEY]:
      remainingSessions
  });
}


// --------------------------------------------------
// RESTORE STATE
// --------------------------------------------------

export async function restoreTrackerState() {
  const stored =
    await chrome.storage.local.get([
      ACTIVE_SESSION_KEY,
      BACKGROUND_AUDIO_KEY
    ]);

  const storedActive =
    stored[
      ACTIVE_SESSION_KEY
    ] as SessionState |
      null |
      undefined;

  if (
    storedActive
  ) {
    activeSession = {
      id:
        storedActive.id ??
        crypto.randomUUID(),

      site:
        storedActive.site,

      startTime:
        storedActive.startTime,

      deviceId:
        typeof storedActive.deviceId ===
          "string"
          ? storedActive.deviceId
          : undefined
    };

    await saveActiveSession();
  }

  const storedBackground =
    stored[
      BACKGROUND_AUDIO_KEY
    ];

  if (
    Array.isArray(
      storedBackground
    )
  ) {
    backgroundAudioSessions.clear();

    for (
      const item
      of storedBackground
    ) {
      if (
        !Array.isArray(
          item
        ) ||
        item.length !== 2
      ) {
        continue;
      }

      const tabId =
        Number(
          item[0]
        );

      const session =
        item[1] as
          SessionState;

      if (
        !Number.isFinite(
          tabId
        ) ||
        !session?.site ||
        !Number.isFinite(
          session.startTime
        )
      ) {
        continue;
      }

      backgroundAudioSessions.set(
        tabId,
        {
          id:
            session.id ??
            crypto.randomUUID(),

          site:
            session.site,

          startTime:
            session.startTime,

          deviceId:
            typeof session.deviceId ===
              "string"
              ? session.deviceId
              : undefined
        }
      );
    }

    await saveBackgroundAudioSessions();
  }

  await syncQueuedSessions();
}


// --------------------------------------------------
// ACTIVE SESSION
// --------------------------------------------------

export async function startSession(
  site: string
) {
  if (
    activeSession?.site ===
    site
  ) {
    return;
  }

  if (
    activeSession
  ) {
    await endSession();
  }

  activeSession = {
    id:
      crypto.randomUUID(),

    site,

    startTime:
      Date.now(),

    deviceId:
      await getLinkedDeviceId()
  };

  await saveActiveSession();

  console.log(
    `[Tracker] ACTIVE ${site} started`
  );
}


export async function endSession() {
  if (
    !activeSession
  ) {
    return;
  }

  const session =
    activeSession;

  const endTime =
    Date.now();

  activeSession =
    null;

  await saveActiveSession();

  const durationSeconds =
    Math.floor(
      (
        endTime -
        session.startTime
      ) /
      1000
    );

  if (
    durationSeconds <= 0
  ) {
    return;
  }

  await addToSyncQueue({
    id:
      session.id,

    site:
      session.site,

    type:
      "active",

    startTime:
      session.startTime,

    endTime,

    durationSeconds,

    deviceId:
      session.deviceId
  });

  await syncQueuedSessions();
}


// --------------------------------------------------
// BACKGROUND AUDIO
// --------------------------------------------------

export async function startBackgroundAudio(
  tabId: number,
  site: string
) {
  const existing =
    backgroundAudioSessions.get(
      tabId
    );

  if (
    existing?.site ===
    site
  ) {
    return;
  }

  if (
    existing
  ) {
    await endBackgroundAudio(
      tabId
    );
  }

  backgroundAudioSessions.set(
    tabId,
    {
      id:
        crypto.randomUUID(),

      site,

      startTime:
        Date.now(),

      deviceId:
        await getLinkedDeviceId()
    }
  );

  await saveBackgroundAudioSessions();

  console.log(
    `[Tracker] BACKGROUND AUDIO ${site} started on tab ${tabId}`
  );
}


export async function endBackgroundAudio(
  tabId: number
) {
  const session =
    backgroundAudioSessions.get(
      tabId
    );

  if (
    !session
  ) {
    return;
  }

  backgroundAudioSessions.delete(
    tabId
  );

  await saveBackgroundAudioSessions();

  const endTime =
    Date.now();

  const durationSeconds =
    Math.floor(
      (
        endTime -
        session.startTime
      ) /
      1000
    );

  if (
    durationSeconds <= 0
  ) {
    return;
  }

  await addToSyncQueue({
    id:
      session.id,

    site:
      session.site,

    type:
      "background_audio",

    startTime:
      session.startTime,

    endTime,

    durationSeconds,

    deviceId:
      session.deviceId
  });

  await syncQueuedSessions();
}


export async function stopMissingBackgroundAudio(
  currentlyAudibleTabIds:
    Set<number>
) {
  for (
    const tabId
    of Array.from(
      backgroundAudioSessions.keys()
    )
  ) {
    if (
      !currentlyAudibleTabIds.has(
        tabId
      )
    ) {
      await endBackgroundAudio(
        tabId
      );
    }
  }
}


// --------------------------------------------------
// FIVE-MINUTE CHECKPOINT
// --------------------------------------------------

export async function checkpointCurrentSessions() {
  if (
    await isTrackingPaused()
  ) {
    return;
  }

  const checkpointTime =
    Date.now();

  const currentDeviceId =
    await getLinkedDeviceId();

  let activeChanged =
    false;

  let backgroundChanged =
    false;

  if (
    activeSession
  ) {
    const oldSession =
      activeSession;

    const durationSeconds =
      Math.floor(
        (
          checkpointTime -
          oldSession.startTime
        ) /
        1000
      );

    if (
      durationSeconds > 0
    ) {
      await addToSyncQueue({
        id:
          oldSession.id,

        site:
          oldSession.site,

        type:
          "active",

        startTime:
          oldSession.startTime,

        endTime:
          checkpointTime,

        durationSeconds,

        deviceId:
          oldSession.deviceId
      });

      activeSession = {
        id:
          crypto.randomUUID(),

        site:
          oldSession.site,

        startTime:
          checkpointTime,

        deviceId:
          currentDeviceId
      };

      activeChanged =
        true;
    }
  }

  for (
    const [
      tabId,
      session
    ]
    of Array.from(
      backgroundAudioSessions.entries()
    )
  ) {
    const durationSeconds =
      Math.floor(
        (
          checkpointTime -
          session.startTime
        ) /
        1000
      );

    if (
      durationSeconds <= 0
    ) {
      continue;
    }

    await addToSyncQueue({
      id:
        session.id,

      site:
        session.site,

      type:
        "background_audio",

      startTime:
        session.startTime,

      endTime:
        checkpointTime,

      durationSeconds,

      deviceId:
        session.deviceId
    });

    backgroundAudioSessions.set(
      tabId,
      {
        id:
          crypto.randomUUID(),

        site:
          session.site,

        startTime:
          checkpointTime,

        deviceId:
          currentDeviceId
      }
    );

    backgroundChanged =
      true;
  }

  if (
    activeChanged
  ) {
    await saveActiveSession();
  }

  if (
    backgroundChanged
  ) {
    await saveBackgroundAudioSessions();
  }
}


// --------------------------------------------------
// HEARTBEAT
// --------------------------------------------------

export async function sendHeartbeat(
  tokenOverride?: string
): Promise<HeartbeatResult> {
  const candidateMode =
    typeof tokenOverride ===
    "string";

  const stored =
    await chrome.storage.local.get(
      DEVICE_TOKEN_KEY
    );

  const storedToken =
    stored[
      DEVICE_TOKEN_KEY
    ] as string | undefined;

  const deviceToken =
    tokenOverride ??
    storedToken;

  if (
    !deviceToken
  ) {
    if (
      !candidateMode
    ) {
      await chrome.storage.local.set({
        backendStatus:
          "unlinked"
      });
    }

    return {
      success:
        false
    };
  }

  let incognitoEnabled =
    false;

  try {
    incognitoEnabled =
      await chrome.extension
        .isAllowedIncognitoAccess();
  } catch (error) {
    console.error(
      "[Tracker] Could not check incognito access:",
      error
    );
  }

  try {
    const response =
      await fetch(
        HEARTBEAT_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${deviceToken}`
          },

          body:
            JSON.stringify({
              incognitoEnabled
            })
        }
      );

    if (
      response.status ===
      401
    ) {
      if (
        !candidateMode
      ) {
        await chrome.storage.local.set({
          backendStatus:
            "revoked"
        });
      }

      return {
        success:
          false
      };
    }

    if (
      !response.ok
    ) {
      if (
        !candidateMode
      ) {
        await chrome.storage.local.set({
          backendStatus:
            "offline"
        });
      }

      console.error(
        "[Tracker] Heartbeat failed:",
        response.status,
        await response.text()
      );

      return {
        success:
          false
      };
    }

    let data:
      HeartbeatApiResponse = {};

    try {
      data =
        await response.json() as
          HeartbeatApiResponse;
    } catch {
      // The heartbeat route should return JSON.
    }

    const verifiedDeviceId =
      typeof data.deviceId ===
        "string"
        ? data.deviceId
        : undefined;

    if (
      !verifiedDeviceId
    ) {
      if (
        !candidateMode
      ) {
        await chrome.storage.local.set({
          backendStatus:
            "offline"
        });
      }

      return {
        success:
          false
      };
    }

    if (
      !candidateMode
    ) {
      await chrome.storage.local.set({
        backendStatus:
          "connected",

        lastBackendSuccess:
          Date.now(),

        [LINKED_DEVICE_ID_KEY]:
          verifiedDeviceId
      });
    }

    return {
      success:
        true,

      deviceId:
        verifiedDeviceId
    };

  } catch (error) {
    if (
      !candidateMode
    ) {
      await chrome.storage.local.set({
        backendStatus:
          "offline"
      });
    }

    console.error(
      "[Tracker] Heartbeat fetch failed:",
      error
    );

    return {
      success:
        false
    };
  }
}


// --------------------------------------------------
// TRACKED SITES
// --------------------------------------------------

export async function refreshTrackedSites(
  tokenOverride?: string
) {
  const candidateMode =
    typeof tokenOverride ===
    "string";

  const stored =
    await chrome.storage.local.get(
      DEVICE_TOKEN_KEY
    );

  const storedToken =
    stored[
      DEVICE_TOKEN_KEY
    ] as string | undefined;

  const deviceToken =
    tokenOverride ??
    storedToken;

  if (
    !deviceToken
  ) {
    return false;
  }

  try {
    const response =
      await fetch(
        TRACKED_SITES_URL,
        {
          headers: {
            "Authorization":
              `Bearer ${deviceToken}`
          }
        }
      );

    if (
      response.status ===
      401
    ) {
      if (
        !candidateMode
      ) {
        await chrome.storage.local.set({
          backendStatus:
            "revoked"
        });
      }

      return false;
    }

    if (
      !response.ok
    ) {
      console.error(
        "[Tracker] Tracked sites refresh failed:",
        response.status
      );

      return false;
    }

    const data =
      await response.json() as
        TrackedSitesApiResponse;

    const trackedSiteConfigs =
      (
        data.trackedSites ??
        []
      ).flatMap(
        (trackedSite) =>
          typeof trackedSite.hostname ===
            "string" &&
          typeof trackedSite.site ===
            "string"
            ? [
                {
                  hostname:
                    trackedSite.hostname,

                  site:
                    trackedSite.site
                }
              ]
            : []
      );

    await setTrackedSites(
      trackedSiteConfigs
    );

    return true;

  } catch (error) {
    console.error(
      "[Tracker] Tracked sites refresh failed:",
      error
    );

    return false;
  }
}


// --------------------------------------------------
// INCOGNITO STATE
// --------------------------------------------------

export async function checkIncognitoStateChange() {
  let incognitoEnabled =
    false;

  try {
    incognitoEnabled =
      await chrome.extension
        .isAllowedIncognitoAccess();
  } catch (error) {
    console.error(
      "[Tracker] Could not check incognito access:",
      error
    );

    return;
  }

  const stored =
    await chrome.storage.local.get(
      INCOGNITO_STATE_KEY
    );

  const previousState =
    stored[
      INCOGNITO_STATE_KEY
    ] as boolean | undefined;

  if (
    previousState ===
    undefined
  ) {
    await chrome.storage.local.set({
      [INCOGNITO_STATE_KEY]:
        incognitoEnabled
    });

    return;
  }

  if (
    previousState ===
    incognitoEnabled
  ) {
    return;
  }

  await chrome.storage.local.set({
    [INCOGNITO_STATE_KEY]:
      incognitoEnabled
  });

  await sendHeartbeat();
}


// --------------------------------------------------
// PAUSE / RESUME
// --------------------------------------------------

export async function isTrackingPaused() {
  const stored =
    await chrome.storage.local.get(
      TRACKING_PAUSED_KEY
    );

  return (
    stored[
      TRACKING_PAUSED_KEY
    ] === true
  );
}


export async function pauseTracking() {
  await chrome.storage.local.set({
    [TRACKING_PAUSED_KEY]:
      true
  });

  await sendTrackingEvent(
    "tracking_paused"
  );
}


export async function resumeTracking() {
  await chrome.storage.local.set({
    [TRACKING_PAUSED_KEY]:
      false
  });

  await sendTrackingEvent(
    "tracking_resumed"
  );
}


async function sendTrackingEvent(
  type:
    | "tracking_paused"
    | "tracking_resumed"
) {
  const stored =
    await chrome.storage.local.get(
      DEVICE_TOKEN_KEY
    );

  const deviceToken =
    stored[
      DEVICE_TOKEN_KEY
    ] as string | undefined;

  if (
    !deviceToken
  ) {
    return;
  }

  try {
    const response =
      await fetch(
        HEARTBEAT_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${deviceToken}`
          },

          body:
            JSON.stringify({
              eventType:
                type
            })
        }
      );

    if (
      response.status ===
      401
    ) {
      await chrome.storage.local.set({
        backendStatus:
          "revoked"
      });

      return;
    }

    if (
      !response.ok
    ) {
      await chrome.storage.local.set({
        backendStatus:
          "offline"
      });

      return;
    }

    let data:
      HeartbeatApiResponse = {};

    try {
      data =
        await response.json() as
          HeartbeatApiResponse;
    } catch {
      // Ignore malformed success body.
    }

    await chrome.storage.local.set({
      backendStatus:
        "connected",

      lastBackendSuccess:
        Date.now(),

      ...(
        typeof data.deviceId ===
          "string"
          ? {
              [LINKED_DEVICE_ID_KEY]:
                data.deviceId
            }
          : {}
      )
    });

  } catch (error) {
    await chrome.storage.local.set({
      backendStatus:
        "offline"
    });

    console.error(
      "[Tracker] Tracking event failed:",
      error
    );
  }
}
