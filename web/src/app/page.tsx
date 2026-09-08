import { redirect } from "next/navigation";

import GenerateReportButton from "./GenerateReportButton";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import NewPeerResponsesLink from "./NewPeerResponsesLink";


// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const HEARTBEAT_INTERVAL_MINUTES = 5;

const UNKNOWN_GAP_MINUTES = 15;


// --------------------------------------------------
// FORMAT DURATION
// --------------------------------------------------

function formatDuration(
  seconds: number
) {
  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
      60
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


// --------------------------------------------------
// FORMAT PERCENTAGE
// --------------------------------------------------

function formatPercentage(
  value: number
) {
  return `${Math.round(value)}%`;
}


// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

export default async function Home() {

  const supabase =
    await createClient();


  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // Keep the authenticated Supabase user synchronized with Prisma.
  if (!user.email) {
    throw new Error("Authenticated user does not have an email address.");
  }

  await prisma.user.upsert({
    where: {
      id: user.id
    },

    update: {
      email: user.email.toLowerCase()
    },

    create: {
      id: user.id,
      email: user.email.toLowerCase()
    }
  });


  // --------------------------------------------------
  // UNREAD REPORT COUNT
  // --------------------------------------------------

  const unreadReportCount =
    await prisma.reportDelivery.count({
      where: {
        peerId:
          user.id,

        viewedAt:
          null
      }
    });


  // --------------------------------------------------
  // LOAD USAGE SESSIONS
  // --------------------------------------------------

  const sessions =
    await prisma.usageSession.findMany({
      where: {
        userId:
          user.id
      },

      orderBy: {
        startTime:
          "desc"
      },

      take: 100
    });


  // --------------------------------------------------
  // LOAD DEVICES
  // --------------------------------------------------

  const devices =
    await prisma.device.findMany({
      where: {
        userId:
          user.id
      },

      orderBy: {
        lastSeenAt:
          "desc"
      }
    });


  const latestDevice =
    devices[0];


  // --------------------------------------------------
  // TODAY
  // --------------------------------------------------

  const now =
    new Date();


  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  // --------------------------------------------------
  // TODAY'S TRACKING EVENTS
  // --------------------------------------------------

  const trackingEvents =
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
    const previousPauseEvent =
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


  // --------------------------------------------------
  // HEARTBEAT EVENTS ONLY
  // --------------------------------------------------

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


const pauseIntervals: {
  start: Date;
  end: Date;
}[] = [];


let paused =
  previousPauseEvent?.type ===
  "tracking_paused";


let pauseStart =
  paused
    ? startOfToday
    : null;


for (
  const event
  of pauseEvents
) {

  if (
    event.type ===
      "tracking_paused" &&
    !paused
  ) {

    paused =
      true;

    pauseStart =
      event.createdAt;
  }


  if (
    event.type ===
      "tracking_resumed" &&
    paused
  ) {

    if (pauseStart) {

      pauseIntervals.push({
        start:
          pauseStart,

        end:
          event.createdAt
      });
    }


    paused =
      false;

    pauseStart =
      null;
  }
}


// Still paused right now.
if (
  paused &&
  pauseStart
) {

  pauseIntervals.push({
    start:
      pauseStart,

    end:
      now
  });
}

function getPausedSeconds(
  start: Date,
  end: Date
) {

  let seconds = 0;


  for (
    const interval
    of pauseIntervals
  ) {

    const overlapStart =
      Math.max(
        start.getTime(),
        interval.start.getTime()
      );


    const overlapEnd =
      Math.min(
        end.getTime(),
        interval.end.getTime()
      );


    if (
      overlapEnd >
      overlapStart
    ) {

      seconds +=
        Math.floor(
          (
            overlapEnd -
            overlapStart
          ) /
          1000
        );
    }
  }


  return seconds;
}


  // --------------------------------------------------
// COVERAGE CALCULATION
// --------------------------------------------------

let goodSeconds = 0;
let limitedSeconds = 0;
let pausedSeconds = 0;
let unknownSeconds = 0;

function addCoverage(
  start: Date,
  end: Date,
  type:
    | "GOOD"
    | "LIMITED"
    | "UNKNOWN"
) {

  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        (
          end.getTime() -
          start.getTime()
        ) /
        1000
      )
    );


  const pausedOverlap =
    getPausedSeconds(
      start,
      end
    );


  const normalSeconds =
    Math.max(
      0,
      totalSeconds -
      pausedOverlap
    );


  pausedSeconds +=
    pausedOverlap;


  if (
    type ===
    "GOOD"
  ) {

    goodSeconds +=
      normalSeconds;

  } else if (
    type ===
    "LIMITED"
  ) {

    limitedSeconds +=
      normalSeconds;

  } else {

    unknownSeconds +=
      normalSeconds;
  }
}


// --------------------------------------------------
// BEFORE FIRST HEARTBEAT
// --------------------------------------------------

if (
  heartbeatEvents.length > 0
) {

  addCoverage(
    startOfToday,
    heartbeatEvents[0].createdAt,
    "UNKNOWN"
  );
}


// --------------------------------------------------
// BETWEEN HEARTBEATS
// --------------------------------------------------

for (
  let index = 0;
  index <
  heartbeatEvents.length - 1;
  index++
) {

  const current =
    heartbeatEvents[index];

  const next =
    heartbeatEvents[
      index + 1
    ];


  const gapMinutes =
    (
      next.createdAt.getTime() -
      current.createdAt.getTime()
    ) /
    (
      1000 *
      60
    );


  if (
    gapMinutes >
    UNKNOWN_GAP_MINUTES
  ) {

    addCoverage(
      current.createdAt,
      next.createdAt,
      "UNKNOWN"
    );

    continue;
  }


  if (
    current.incognitoEnabled
  ) {

    addCoverage(
      current.createdAt,
      next.createdAt,
      "GOOD"
    );

  } else {

    addCoverage(
      current.createdAt,
      next.createdAt,
      "LIMITED"
    );
  }
}


// --------------------------------------------------
// LAST HEARTBEAT → NOW
// --------------------------------------------------

if (
  heartbeatEvents.length > 0
) {

  const lastHeartbeat =
    heartbeatEvents[
      heartbeatEvents.length - 1
    ];


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
    minutesSinceLastHeartbeat >
    UNKNOWN_GAP_MINUTES
  ) {

    addCoverage(
      lastHeartbeat.createdAt,
      now,
      "UNKNOWN"
    );

  } else if (
    lastHeartbeat.incognitoEnabled
  ) {

    addCoverage(
      lastHeartbeat.createdAt,
      now,
      "GOOD"
    );

  } else {

    addCoverage(
      lastHeartbeat.createdAt,
      now,
      "LIMITED"
    );
  }
}


// --------------------------------------------------
// NO HEARTBEATS TODAY
// --------------------------------------------------

if (
  heartbeatEvents.length === 0
) {

  addCoverage(
    startOfToday,
    now,
    "UNKNOWN"
  );
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
  // CURRENT TRACKING STATUS
  // --------------------------------------------------

  let currentTrackingStatus =
    "UNKNOWN";


  // Find the most recent pause or resume event.
  const latestPauseEvent =
    [...trackingEvents]
      .reverse()
      .find(
        (event) =>
          event.type ===
            "tracking_paused" ||
          event.type ===
            "tracking_resumed"
      );


  const currentlyPaused =
    latestPauseEvent?.type ===
    "tracking_paused";


  if (currentlyPaused) {

    currentTrackingStatus =
      "PAUSED";

  } else {

    const lastHeartbeat =
      heartbeatEvents[
        heartbeatEvents.length - 1
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
  // TODAY'S USAGE SESSIONS
  // --------------------------------------------------

  const todaySessions =
    sessions.filter(
      (session) =>
        session.startTime >=
        startOfToday
    );


  // --------------------------------------------------
  // USAGE TOTALS
  // --------------------------------------------------

  const totalSeconds =
    todaySessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.durationSeconds,
      0
    );


  const activeSeconds =
    todaySessions
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
    todaySessions
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
    of todaySessions
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
          "1000px",

        margin:
          "0 auto",

        padding:
          "40px 20px",

        fontFamily:
          "Arial, sans-serif"
      }}
    >

      <h1>
        Accountability Tracker
      </h1>


      <p>
        Logged in as{" "}
        <strong>
          {user.email}
        </strong>
      </p>

            {/* ACCOUNTABILITY NAVIGATION */}

      <section
        style={{
          marginTop: "30px"
        }}
      >

        <h2>
          Accountability
        </h2>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginTop: "15px"
          }}
        >

          {/* MY ACCOUNTABILITY */}

          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "20px"
            }}
          >

            <h3>
              My Accountability
            </h3>


            <p
              style={{
                color: "#555"
              }}
            >
              View your reports and feedback from
              your accountability peers.
            </p>


            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "12px"
              }}
            >

              <Link href="/reports">
                My Daily Reports
              </Link>


              <NewPeerResponsesLink
                userId={
                  user.id
                }
              />

            </div>

          </div>


          {/* ACCOUNTABILITY FOR OTHERS */}

          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "20px"
            }}
          >

            <h3>
              Accountability for Others
            </h3>


            <p
              style={{
                color: "#555"
              }}
            >
              Review reports from people who trust
              you to hold them accountable.
            </p>


            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "12px"
              }}
            >

              <Link href="/inbox">

                Report Inbox

                {
                  unreadReportCount > 0 &&
                  ` (${unreadReportCount} unread)`
                }

              </Link>


              <Link href="/peers">
                Trusted Peers
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* REPORT GENERATION */}

      <section
        style={{
          marginTop: "30px"
        }}
      >

        <h2>
          Daily Report
        </h2>


        <p>
          Generate your accountability report
          manually for testing.
        </p>


        <GenerateReportButton />

      </section>


      {/* SETTINGS */}

      <section
        style={{
          marginTop: "30px"
        }}
      >

        <h2>
          Settings
        </h2>

        <Link href="/devices">
          Devices
        </Link>

        <Link href="/settings">
          Timezone & Settings
        </Link>

      </section>


      <hr
        style={{
          margin: "30px 0"
        }}
      />

      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* CURRENT TRACKING STATUS */}

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

            {
              currentTrackingStatus
            }
          </p>


          {latestDevice ? (
            <>

              <p>
                <strong>
                  Device:
                </strong>{" "}

                {latestDevice.name}
              </p>


              <p>
                <strong>
                  Last heartbeat:
                </strong>{" "}

                {
                  latestDevice.lastSeenAt
                    ? latestDevice.lastSeenAt.toLocaleString()
                    : "Never"
                }
              </p>

            </>
          ) : (

            <p>
              No linked device found.
            </p>

          )}

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


        <p
          style={{
            marginTop:
              "15px"
          }}
        >
          Heartbeats expected every{" "}
          {HEARTBEAT_INTERVAL_MINUTES} minutes.
          Gaps longer than{" "}
          {UNKNOWN_GAP_MINUTES} minutes
          are treated as unknown coverage.
        </p>

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* USAGE SUMMARY */}

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

              padding:
                "20px",

              borderRadius:
                "8px"
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

              padding:
                "20px",

              borderRadius:
                "8px"
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

              padding:
                "20px",

              borderRadius:
                "8px"
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
          siteUsage.length ===
          0
            ? (
              <p>
                No tracked usage today.
              </p>
            )
            : (
              <div
                style={{
                  marginTop:
                    "15px"
                }}
              >

                {
                  siteUsage.map(
                    (
                      [
                        site,
                        seconds
                      ]
                    ) => (

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
                            "10px 0",

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


      {/* RECENT SESSIONS */}

      <section>

        <h2>
          Recent Sessions
        </h2>


        {
          sessions.length ===
          0
            ? (
              <p>
                No sessions recorded yet.
              </p>
            )
            : (
              <div
                style={{
                  overflowX:
                    "auto",

                  marginTop:
                    "15px"
                }}
              >

                <table
                  style={{
                    width:
                      "100%",

                    borderCollapse:
                      "collapse"
                  }}
                >

                  <thead>

                    <tr>

                      <th
                        style={{
                          textAlign:
                            "left",

                          padding:
                            "10px",

                          borderBottom:
                            "1px solid #ccc"
                        }}
                      >
                        Site
                      </th>


                      <th
                        style={{
                          textAlign:
                            "left",

                          padding:
                            "10px",

                          borderBottom:
                            "1px solid #ccc"
                        }}
                      >
                        Type
                      </th>


                      <th
                        style={{
                          textAlign:
                            "left",

                          padding:
                            "10px",

                          borderBottom:
                            "1px solid #ccc"
                        }}
                      >
                        Started
                      </th>


                      <th
                        style={{
                          textAlign:
                            "left",

                          padding:
                            "10px",

                          borderBottom:
                            "1px solid #ccc"
                        }}
                      >
                        Duration
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      sessions.map(
                        (
                          session
                        ) => (

                          <tr
                            key={
                              session.id
                            }
                          >

                            <td
                              style={{
                                padding:
                                  "10px",

                                borderBottom:
                                  "1px solid #eee"
                              }}
                            >
                              {
                                session.site
                              }
                            </td>


                            <td
                              style={{
                                padding:
                                  "10px",

                                borderBottom:
                                  "1px solid #eee"
                              }}
                            >
                              {
                                session.type
                              }
                            </td>


                            <td
                              style={{
                                padding:
                                  "10px",

                                borderBottom:
                                  "1px solid #eee"
                              }}
                            >
                              {
                                session.startTime.toLocaleString()
                              }
                            </td>


                            <td
                              style={{
                                padding:
                                  "10px",

                                borderBottom:
                                  "1px solid #eee"
                              }}
                            >
                              {
                                formatDuration(
                                  session.durationSeconds
                                )
                              }
                            </td>

                          </tr>

                        )
                      )
                    }

                  </tbody>

                </table>

              </div>
            )
        }

      </section>

    </main>
  );
}