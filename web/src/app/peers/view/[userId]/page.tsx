import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import {
  getDayStartUtc,
} from "@/lib/reports/reportTime";

import type {
  CalendarDate
} from "@/lib/reports/reportTime";


type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};


const UNKNOWN_GAP_MINUTES = 15;


function formatDuration(
  seconds: number
) {

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );

  const remainingSeconds =
    seconds % 60;


  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }


  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }


  return `${remainingSeconds}s`;
}


function formatPercentage(
  value: number
) {
  return `${Math.round(value)}%`;
}


export default async function PeerViewPage({
  params
}: PageProps) {

  // Get the logged-in peer.
  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  const {
    userId
  } =
    await params;


  // --------------------------------------------------
  // AUTHORIZE PEER
  // --------------------------------------------------

  const relationship =
    await prisma.trustedPeer.findUnique({

      where: {

        ownerId_peerId: {

          // Person whose data is being viewed.
          ownerId:
            userId,

          // Logged-in accountability peer.
          peerId:
            user.id
        }

      },

      include: {
        owner:
          true
      }

    });


  if (
    !relationship ||
    relationship.status !== "accepted"
  ) {

    return (
      <main
        style={{
          maxWidth:
            "800px",

          margin:
            "0 auto",

          padding:
            "40px 20px",

          fontFamily:
            "Arial, sans-serif"
        }}
      >

        <Link href="/peers">
          ← Back to Peers
        </Link>


        <h1>
          Access Denied
        </h1>


        <p>
          You are not an accepted
          accountability peer for
          this user.
        </p>

      </main>
    );
  }


  // --------------------------------------------------
  // TODAY
  // --------------------------------------------------

  const now =
  new Date();


const ownerTimeZone =
  relationship.owner.timezone;


// Convert "now" into the owner's local calendar date.
const dateParts =
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        ownerTimeZone,

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit"
    }
  )
    .formatToParts(
      now
    );


const year =
  Number(
    dateParts.find(
      (part) =>
        part.type ===
        "year"
    )?.value
  );


const month =
  Number(
    dateParts.find(
      (part) =>
        part.type ===
        "month"
    )?.value
  );


const day =
  Number(
    dateParts.find(
      (part) =>
        part.type ===
        "day"
    )?.value
  );


const today:
  CalendarDate = {
    year,
    month,
    day
  };


const startOfToday =
  getDayStartUtc(
    today,
    ownerTimeZone
  );


  // --------------------------------------------------
  // LOAD USAGE
  // --------------------------------------------------

  const sessions =
  await prisma.usageSession.findMany({

    where: {

      userId,

      // Session started before today's current endpoint.
      startTime: {
        lt:
          now
      },

      // Session ended after today began.
      endTime: {
        gt:
          startOfToday
      }

    },

    orderBy: {
      startTime:
        "desc"
    }

  });

  // Keep only the portion of each session
// that belongs to today.
const clippedSessions =
  sessions
    .map(
      (session) => {

        const effectiveStart =
          Math.max(
            session.startTime.getTime(),
            startOfToday.getTime()
          );


        const effectiveEnd =
          Math.min(
            session.endTime.getTime(),
            now.getTime()
          );


        const durationSeconds =
          Math.max(
            0,

            Math.floor(
              (
                effectiveEnd -
                effectiveStart
              ) /
              1000
            )
          );


        return {
          ...session,
          durationSeconds
        };

      }
    )
    .filter(
      (session) =>
        session.durationSeconds >
        0
    );


  // --------------------------------------------------
  // LOAD DEVICE
  // --------------------------------------------------

  // --------------------------------------------------
// LOAD TODAY'S DEVICES
// --------------------------------------------------

/*
  Coverage may come from multiple devices.

  Example:

  Device A:
  active this morning, then revoked

  Device B:
  linked this afternoon

  Both devices matter for today's historical
  coverage, but only a non-revoked device can
  represent the current tracking status.
*/

const todaysDevices =
  await prisma.device.findMany({

    where: {

      userId,

      // Device existed before the current moment.
      createdAt: {
        lt:
          now
      },

      // Device was still valid at some point today.
      OR: [
        {
          revokedAt:
            null
        },
        {
          revokedAt: {
            gt:
              startOfToday
          }
        }
      ]

    },

    orderBy: {
      createdAt:
        "asc"
    }

  });


// Current status must only use a non-revoked device.
const latestDevice =
  todaysDevices
    .filter(
      (device) =>
        device.revokedAt ===
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        (
          second
            .lastSeenAt
            ?.getTime() ??
          0
        ) -
        (
          first
            .lastSeenAt
            ?.getTime() ??
          0
        )
    )[0];


    // --------------------------------------------------
  // MULTI-DEVICE TRACKING COVERAGE
  // --------------------------------------------------

  type CoverageType =
    | "GOOD"
    | "LIMITED"
    | "PAUSED"
    | "UNKNOWN";


  type CoverageSegment = {
    start: Date;
    end: Date;
    type: CoverageType;
  };


  const deviceCoverageSegments:
    CoverageSegment[] = [];


  /*
    A user may relink during the day.

    Old revoked devices still matter for the
    portion of today when they were valid.
  */
  for (
    const device
    of todaysDevices
  ) {

    const deviceStart =
      new Date(
        Math.max(
          device.createdAt.getTime(),
          startOfToday.getTime()
        )
      );


    const deviceEnd =
      new Date(
        Math.min(
          device.revokedAt
            ?.getTime() ??
            now.getTime(),

          now.getTime()
        )
      );


    if (
      deviceEnd.getTime() <=
      deviceStart.getTime()
    ) {
      continue;
    }


    // ----------------------------------------------
    // LOAD EVENTS FOR THIS DEVICE
    // ----------------------------------------------

    const trackingEvents =
      await prisma.trackingEvent.findMany({

        where: {

          deviceId:
            device.id,

          createdAt: {
            gte:
              deviceStart,

            lt:
              deviceEnd
          }

        },

        orderBy: {
          createdAt:
            "asc"
        }

      });


    // Determine pause state at device interval start.
    const previousPauseEvent =
      await prisma.trackingEvent.findFirst({

        where: {

          deviceId:
            device.id,

          type: {
            in: [
              "tracking_paused",
              "tracking_resumed"
            ]
          },

          createdAt: {
            lt:
              deviceStart
          }

        },

        orderBy: {
          createdAt:
            "desc"
        }

      });


    const heartbeatEvents =
      trackingEvents.filter(
        (event) =>
          event.type ===
          "heartbeat"
      );


    const pauseEvents =
      trackingEvents.filter(
        (event) =>
          event.type ===
            "tracking_paused" ||
          event.type ===
            "tracking_resumed"
      );


    // ----------------------------------------------
    // BUILD PAUSE INTERVALS
    // ----------------------------------------------

    const pauseIntervals: {
      start: Date;
      end: Date;
    }[] = [];


    let devicePaused =
      previousPauseEvent
        ?.type ===
      "tracking_paused";


    let devicePauseStart:
      Date | null =
        devicePaused
          ? deviceStart
          : null;


    for (
      const event
      of pauseEvents
    ) {

      if (
        event.type ===
          "tracking_paused" &&
        !devicePaused
      ) {

        devicePaused =
          true;

        devicePauseStart =
          event.createdAt;

      }


      if (
        event.type ===
          "tracking_resumed" &&
        devicePaused
      ) {

        if (
          devicePauseStart
        ) {

          pauseIntervals.push({
            start:
              devicePauseStart,

            end:
              event.createdAt
          });

        }


        devicePaused =
          false;

        devicePauseStart =
          null;

      }

    }


    // Pause continued until device stopped being valid.
    if (
      devicePaused &&
      devicePauseStart
    ) {

      pauseIntervals.push({
        start:
          devicePauseStart,

        end:
          deviceEnd
      });

    }


    // ----------------------------------------------
    // BUILD HEARTBEAT COVERAGE
    // ----------------------------------------------

    const heartbeatCoverage:
      CoverageSegment[] = [];


    if (
      heartbeatEvents.length ===
      0
    ) {

      heartbeatCoverage.push({
        start:
          deviceStart,

        end:
          deviceEnd,

        type:
          "UNKNOWN"
      });

    } else {

      // Device start → first heartbeat.
      if (
        heartbeatEvents[0]
          .createdAt
          .getTime() >
        deviceStart.getTime()
      ) {

        heartbeatCoverage.push({
          start:
            deviceStart,

          end:
            heartbeatEvents[0]
              .createdAt,

          type:
            "UNKNOWN"
        });

      }


      // Between heartbeats.
      for (
        let index = 0;
        index <
          heartbeatEvents.length - 1;
        index++
      ) {

        const current =
          heartbeatEvents[
            index
          ];


        const next =
          heartbeatEvents[
            index + 1
          ];


        const gapMinutes =
          (
            next
              .createdAt
              .getTime() -
            current
              .createdAt
              .getTime()
          ) /
          (
            1000 *
            60
          );


        const coverageType:
          CoverageType =
            gapMinutes >
              UNKNOWN_GAP_MINUTES
              ? "UNKNOWN"
              : current
                  .incognitoEnabled
                ? "GOOD"
                : "LIMITED";


        heartbeatCoverage.push({
          start:
            current.createdAt,

          end:
            next.createdAt,

          type:
            coverageType
        });

      }


      // Last heartbeat → end of device interval.
      // Last heartbeat → end of device interval.
      const lastHeartbeat =
        heartbeatEvents[
          heartbeatEvents.length - 1
        ];

      if (
        deviceEnd.getTime() >
        lastHeartbeat.createdAt.getTime()
      ) {

        const finalGapMinutes =
          (
            deviceEnd.getTime() -
            lastHeartbeat.createdAt.getTime()
          ) /
          (
            1000 *
            60
          );


        /*
          If this device was revoked, we cannot assume
          tracking remained healthy after its final
          heartbeat.

          An active device still receives the normal
          heartbeat grace period.
        */
        const finalCoverageType:
          CoverageType =
            device.revokedAt
              ? "UNKNOWN"
              : finalGapMinutes >
                  UNKNOWN_GAP_MINUTES
                ? "UNKNOWN"
                : lastHeartbeat
                    .incognitoEnabled
                  ? "GOOD"
                  : "LIMITED";


        heartbeatCoverage.push({
          start:
            lastHeartbeat.createdAt,

          end:
            deviceEnd,

          type:
            finalCoverageType
        });

      }

    }


    // ----------------------------------------------
    // APPLY PAUSE STATE
    // ----------------------------------------------

    const boundaryTimes =
      new Set<number>();


    boundaryTimes.add(
      deviceStart.getTime()
    );

    boundaryTimes.add(
      deviceEnd.getTime()
    );


    for (
      const segment
      of heartbeatCoverage
    ) {

      boundaryTimes.add(
        segment.start.getTime()
      );

      boundaryTimes.add(
        segment.end.getTime()
      );

    }


    for (
      const interval
      of pauseIntervals
    ) {

      boundaryTimes.add(
        interval.start.getTime()
      );

      boundaryTimes.add(
        interval.end.getTime()
      );

    }


    const boundaries =
      Array.from(
        boundaryTimes
      ).sort(
        (
          first,
          second
        ) =>
          first -
          second
      );


    for (
      let index = 0;
      index <
        boundaries.length - 1;
      index++
    ) {

      const segmentStart =
        new Date(
          boundaries[
            index
          ]
        );


      const segmentEnd =
        new Date(
          boundaries[
            index + 1
          ]
        );


      if (
        segmentEnd.getTime() <=
        segmentStart.getTime()
      ) {
        continue;
      }


      const isPaused =
        pauseIntervals.some(
          (interval) =>
            interval.start.getTime() <
              segmentEnd.getTime() &&
            interval.end.getTime() >
              segmentStart.getTime()
        );


      if (isPaused) {

        deviceCoverageSegments.push({
          start:
            segmentStart,

          end:
            segmentEnd,

          type:
            "PAUSED"
        });


        continue;

      }


      const heartbeatSegment =
        heartbeatCoverage.find(
          (segment) =>
            segment.start.getTime() <=
              segmentStart.getTime() &&
            segment.end.getTime() >=
              segmentEnd.getTime()
        );


      deviceCoverageSegments.push({
        start:
          segmentStart,

        end:
          segmentEnd,

        type:
          heartbeatSegment
            ?.type ??
            "UNKNOWN"
      });

    }

  }


  // --------------------------------------------------
  // COMBINE DEVICES INTO ONE TIMELINE
  // --------------------------------------------------

  const globalBoundaryTimes =
    new Set<number>();


  globalBoundaryTimes.add(
    startOfToday.getTime()
  );

  globalBoundaryTimes.add(
    now.getTime()
  );


  for (
    const segment
    of deviceCoverageSegments
  ) {

    globalBoundaryTimes.add(
      segment.start.getTime()
    );

    globalBoundaryTimes.add(
      segment.end.getTime()
    );

  }


  const globalBoundaries =
    Array.from(
      globalBoundaryTimes
    ).sort(
      (
        first,
        second
      ) =>
        first -
        second
    );


  let goodSeconds = 0;

  let limitedSeconds = 0;

  let pausedSeconds = 0;

  let unknownSeconds = 0;


  for (
    let index = 0;
    index <
      globalBoundaries.length - 1;
    index++
  ) {

    const segmentStart =
      new Date(
        globalBoundaries[
          index
        ]
      );


    const segmentEnd =
      new Date(
        globalBoundaries[
          index + 1
        ]
      );


    const durationSeconds =
      Math.max(
        0,

        Math.floor(
          (
            segmentEnd.getTime() -
            segmentStart.getTime()
          ) /
          1000
        )
      );


    if (
      durationSeconds ===
      0
    ) {
      continue;
    }


    const activeTypes =
      deviceCoverageSegments
        .filter(
          (segment) =>
            segment.start.getTime() <
              segmentEnd.getTime() &&
            segment.end.getTime() >
              segmentStart.getTime()
        )
        .map(
          (segment) =>
            segment.type
        );


    let finalType:
      CoverageType =
        "UNKNOWN";


    /*
      Strongest available tracking evidence wins.

      GOOD > LIMITED > PAUSED > UNKNOWN
    */
    if (
      activeTypes.includes(
        "GOOD"
      )
    ) {

      finalType =
        "GOOD";

    } else if (
      activeTypes.includes(
        "LIMITED"
      )
    ) {

      finalType =
        "LIMITED";

    } else if (
      activeTypes.includes(
        "PAUSED"
      )
    ) {

      finalType =
        "PAUSED";

    }


    if (
      finalType ===
      "GOOD"
    ) {

      goodSeconds +=
        durationSeconds;

    } else if (
      finalType ===
      "LIMITED"
    ) {

      limitedSeconds +=
        durationSeconds;

    } else if (
      finalType ===
      "PAUSED"
    ) {

      pausedSeconds +=
        durationSeconds;

    } else {

      unknownSeconds +=
        durationSeconds;

    }

  }


  // --------------------------------------------------
  // COVERAGE TOTALS
  // --------------------------------------------------

  const totalCoverageSeconds =
    goodSeconds +
    limitedSeconds +
    pausedSeconds +
    unknownSeconds;


  const goodPercentage =
    totalCoverageSeconds > 0
      ? (
          goodSeconds /
          totalCoverageSeconds
        ) * 100
      : 0;


  const limitedPercentage =
    totalCoverageSeconds > 0
      ? (
          limitedSeconds /
          totalCoverageSeconds
        ) * 100
      : 0;


  const pausedPercentage =
    totalCoverageSeconds > 0
      ? (
          pausedSeconds /
          totalCoverageSeconds
        ) * 100
      : 0;


  const unknownPercentage =
    totalCoverageSeconds > 0
      ? (
          unknownSeconds /
          totalCoverageSeconds
        ) * 100
      : 0;


  // --------------------------------------------------
  // LOAD CURRENT DEVICE EVENTS
  // --------------------------------------------------

  /*
    Historical coverage uses every device from today.

    Current status uses only the currently linked
    non-revoked device.
  */

  const currentTrackingEvents =
    latestDevice
      ? await prisma.trackingEvent.findMany({

          where: {

            deviceId:
              latestDevice.id,

            createdAt: {
              gte:
                startOfToday
            }

          },

          orderBy: {
            createdAt:
              "asc"
          }

        })
      : [];


  const currentPreviousPauseEvent =
    latestDevice
      ? await prisma.trackingEvent.findFirst({

          where: {

            deviceId:
              latestDevice.id,

            type: {
              in: [
                "tracking_paused",
                "tracking_resumed"
              ]
            },

            createdAt: {
              lt:
                startOfToday
            }

          },

          orderBy: {
            createdAt:
              "desc"
          }

        })
      : null;


  const currentHeartbeatEvents =
    currentTrackingEvents.filter(
      (event) =>
        event.type ===
        "heartbeat"
    );


  const currentPauseEvents =
    currentTrackingEvents.filter(
      (event) =>
        event.type ===
          "tracking_paused" ||
      event.type ===
          "tracking_resumed"
    );

  // --------------------------------------------------
  // CURRENT TRACKING STATUS
  // --------------------------------------------------

  let currentTrackingStatus =
    "UNKNOWN";


  const latestPauseEventToday =
  [...currentPauseEvents]
    .reverse()[0];


  /*
    If there was no pause/resume event today,
    use yesterday's latest state.

    This fixes pauses that cross midnight.
  */
  const latestPauseState =
  latestPauseEventToday ??
  currentPreviousPauseEvent;


  const currentlyPaused =
    latestPauseState?.type ===
    "tracking_paused";


  if (currentlyPaused) {

    currentTrackingStatus =
      "PAUSED";

  } else {

    const lastHeartbeat =
      currentHeartbeatEvents[
        currentHeartbeatEvents.length - 1
      ];


    if (lastHeartbeat) {

      const minutesSinceLastHeartbeat =
        (
          now.getTime() -
          lastHeartbeat.createdAt.getTime()
        ) /
        (
          1000 *
          60
        );


      if (
        minutesSinceLastHeartbeat <=
        UNKNOWN_GAP_MINUTES
      ) {

        currentTrackingStatus =
          lastHeartbeat.incognitoEnabled
            ? "GOOD"
            : "LIMITED";

      }

    }

  }


  // --------------------------------------------------
  // USAGE TOTALS
  // --------------------------------------------------

  const totalSeconds =
    clippedSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.durationSeconds,
      0
    );


  const activeSeconds =
    clippedSessions
      .filter(
        (session) =>
          session.type ===
          "active"
      )
      .reduce(
        (
          total,
          session
        ) =>
          total +
          session.durationSeconds,
        0
      );


  const backgroundSeconds =
    clippedSessions
      .filter(
        (session) =>
          session.type ===
          "background_audio"
      )
      .reduce(
        (
          total,
          session
        ) =>
          total +
          session.durationSeconds,
        0
      );


  // --------------------------------------------------
  // SITE TOTALS
  // --------------------------------------------------

  const siteTotals =
    new Map<
      string,
      number
    >();


  for (
    const session
    of clippedSessions
  ) {

    const current =
      siteTotals.get(
        session.site
      ) ?? 0;


    siteTotals.set(
      session.site,
      current +
        session.durationSeconds
    );

  }


  const siteUsage =
    Array.from(
      siteTotals.entries()
    ).sort(
      (
        first,
        second
      ) =>
        second[1] -
        first[1]
    );


  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main
      style={{
        maxWidth:
          "900px",

        margin:
          "0 auto",

        padding:
          "40px 20px",

        fontFamily:
          "Arial, sans-serif"
      }}
    >

      <Link href="/peers">
        ← Back to Peers
      </Link>


      <h1>
        Accountability View
      </h1>


      <p>
        You are holding{" "}

        <strong>
          {
            relationship
              .owner
              .email
          }
        </strong>

        {" "}accountable.
      </p>
      <Link
  href={
    `/peers/view/${userId}/reports`
  }
  style={{
    display: "inline-block",
    marginTop: "10px",
    padding: "10px 14px",
    border: "1px solid #333",
    borderRadius: "6px",
    textDecoration: "none"
  }}
>
  View Daily Reports
</Link>

      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* CURRENT STATUS */}

      <section>

        <h2>
          Current Tracking Status
        </h2>


        <div
          style={{
            border:
              "1px solid #ccc",

            borderRadius:
              "8px",

            padding:
              "20px",

            marginTop:
              "15px"
          }}
        >

          <p>
            <strong>
              Status:
            </strong>{" "}

            {currentTrackingStatus}
          </p>


          {
            latestDevice
              ? (
                <>

                  <p>
                    <strong>
                      Device:
                    </strong>{" "}

                    {
                      latestDevice
                        .name
                    }
                  </p>


                  <p>
                    <strong>
                      Last seen:
                    </strong>{" "}

                    {
                      latestDevice.lastSeenAt
                        ? latestDevice
                            .lastSeenAt
                            .toLocaleString()
                        : "Never"
                    }
                  </p>

                </>
              )
              : (
                <p>
                  No linked tracking
                  device found.
                </p>
              )
          }

        </div>

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* TRACKING COVERAGE */}

      <section>

        <h2>
          Today's Tracking Coverage
        </h2>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",

            gap:
              "15px",

            marginTop:
              "15px"
          }}
        >

          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Good
            </h3>

            <p>
              {
                formatDuration(
                  goodSeconds
                )
              }
            </p>

            <p>
              {
                formatPercentage(
                  goodPercentage
                )
              }
            </p>

          </div>


          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Limited
            </h3>

            <p>
              {
                formatDuration(
                  limitedSeconds
                )
              }
            </p>

            <p>
              {
                formatPercentage(
                  limitedPercentage
                )
              }
            </p>

          </div>


          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Paused
            </h3>

            <p>
              {
                formatDuration(
                  pausedSeconds
                )
              }
            </p>

            <p>
              {
                formatPercentage(
                  pausedPercentage
                )
              }
            </p>

          </div>


          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Unknown
            </h3>

            <p>
              {
                formatDuration(
                  unknownSeconds
                )
              }
            </p>

            <p>
              {
                formatPercentage(
                  unknownPercentage
                )
              }
            </p>

          </div>

        </div>

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* USAGE */}

      <section>

        <h2>
          Today's Usage
        </h2>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",

            gap:
              "15px",

            marginTop:
              "15px"
          }}
        >

          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Total Usage
            </h3>

            <p>
              {
                formatDuration(
                  totalSeconds
                )
              }
            </p>

          </div>


          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Active Usage
            </h3>

            <p>
              {
                formatDuration(
                  activeSeconds
                )
              }
            </p>

          </div>


          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "8px",

              padding:
                "20px"
            }}
          >

            <h3>
              Background Audio
            </h3>

            <p>
              {
                formatDuration(
                  backgroundSeconds
                )
              }
            </p>

          </div>

        </div>

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* SITE BREAKDOWN */}

      <section>

        <h2>
          Site Breakdown
        </h2>


        {
          siteUsage.length === 0
            ? (
              <p>
                No tracked usage today.
              </p>
            )
            : (
              <div>

                {
                  siteUsage.map(
                    ([
                      site,
                      seconds
                    ]) => (

                      <div
                        key={
                          site
                        }
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          padding:
                            "12px 0",

                          borderBottom:
                            "1px solid #eee"
                        }}
                      >

                        <span>
                          {site}
                        </span>


                        <strong>
                          {
                            formatDuration(
                              seconds
                            )
                          }
                        </strong>

                      </div>

                    )
                  )
                }

              </div>
            )
        }

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* RECENT ACTIVITY */}

      <section>

        <h2>
          Recent Activity
        </h2>


        {
          sessions.length === 0
            ? (
              <p>
                No sessions recorded today.
              </p>
            )
            : (
              <div>

                {
                  sessions.map(
                    (session) => (

                      <div
                        key={
                          session.id
                        }
                        style={{
                          border:
                            "1px solid #ccc",

                          borderRadius:
                            "8px",

                          padding:
                            "15px",

                          marginBottom:
                            "10px"
                        }}
                      >

                        <strong>
                          {session.site}
                        </strong>


                        <p>
                          Type:{" "}
                          {session.type}
                        </p>


                        <p>
                          Duration:{" "}

                          {
                            formatDuration(
                              session
                                .durationSeconds
                            )
                          }
                        </p>


                        <p>
                          Started:{" "}

                          {
                            session
                              .startTime
                              .toLocaleString()
                          }
                        </p>

                      </div>

                    )
                  )
                }

              </div>
            )
        }

      </section>

    </main>
  );
}