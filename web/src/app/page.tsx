import Link from "next/link";

import {
  redirect
} from "next/navigation";

import {
  prisma
} from "@/lib/prisma";

import {
  createClient
} from "@/lib/supabase/server";

import {
  getCalendarDateInTimeZone,
  getDayStartUtc
} from "@/lib/reports/reportTime";

import {
  calculateTrackingCoverage,
  getCurrentTrackingStatus
} from "@/lib/reports/trackingCoverage";

import {
  groupContinuousUsageSessions
} from "@/lib/usage/activitySegments";

import GenerateReportButton from "./GenerateReportButton";
import NewPeerResponsesLink from "./NewPeerResponsesLink";


function formatDuration(
  seconds: number
) {
  const hours =
    Math.floor(
      seconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
      60
    );

  const remainingSeconds =
    seconds %
    60;

  if (
    hours > 0
  ) {
    return `${hours}h ${minutes}m`;
  }

  if (
    minutes > 0
  ) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}


function formatPercentage(
  seconds: number,
  total: number
) {
  if (
    total <= 0
  ) {
    return "0%";
  }

  return `${Math.round(
    (
      seconds /
      total
    ) *
    100
  )}%`;
}


function formatDateTime(
  date: Date,
  timeZone: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,

      dateStyle:
        "medium",

      timeStyle:
        "medium"
    }
  ).format(
    date
  );
}


export default async function Home() {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/auth"
    );
  }

  if (
    !user.email
  ) {
    throw new Error(
      "Authenticated user does not have an email address."
    );
  }

  const profile =
    await prisma.user.upsert({
      where: {
        id:
          user.id
      },

      update: {
        email:
          user.email
            .toLowerCase()
      },

      create: {
        id:
          user.id,

        email:
          user.email
            .toLowerCase()
      },

      select: {
        timezone:
          true
      }
    });

  const unreadReportCount =
    await prisma.reportDelivery.count({
      where: {
        peerId:
          user.id,

        viewedAt:
          null
      }
    });

  const now =
    new Date();

  const today =
    getCalendarDateInTimeZone(
      now,
      profile.timezone
    );

  const startOfToday =
    getDayStartUtc(
      today,
      profile.timezone
    );


  // --------------------------------------------------
  // TODAY'S USAGE - NO 100-ROW CAP
  // --------------------------------------------------

  const sessions =
    await prisma.usageSession.findMany({
      where: {
        userId:
          user.id,

        startTime: {
          lt:
            now
        },

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

  const siteTotals =
    new Map<
      string,
      number
    >();

  for (
    const session
    of clippedSessions
  ) {
    siteTotals.set(
      session.site,
      (
        siteTotals.get(
          session.site
        ) ?? 0
      ) +
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
  // SHARED INTEGRITY LOGIC
  // --------------------------------------------------

  const coverage =
    await calculateTrackingCoverage(
      user.id,
      startOfToday,
      now
    );

  const current =
    await getCurrentTrackingStatus(
      user.id,
      now
    );

  const totalCoverage =
    coverage.goodSeconds +
    coverage.limitedSeconds +
    coverage.pausedSeconds +
    coverage.unknownSeconds;

  const recentActivitySegments =
    groupContinuousUsageSessions(
      clippedSessions
    ).slice(
      0,
      20
    );


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

      <p>
        Timezone:{" "}
        <strong>
          {profile.timezone}
        </strong>
      </p>


      {/* ACCOUNTABILITY */}

      <section
        style={{
          marginTop:
            "30px"
        }}
      >
        <h2>
          Accountability
        </h2>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",

            gap:
              "20px"
          }}
        >
          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "10px",

              padding:
                "20px"
            }}
          >
            <h3>
              My Accountability
            </h3>

            <p>
              Review your reports and feedback
              from your accountability peers.
            </p>

            <p>
              <Link href="/reports">
                My Daily Reports
              </Link>
            </p>

            <p>
              <Link href="/peers/preview">
                Preview Peer View
              </Link>
            </p>

            <NewPeerResponsesLink
              userId={
                user.id
              }
            />
          </div>

          <div
            style={{
              border:
                "1px solid #ccc",

              borderRadius:
                "10px",

              padding:
                "20px"
            }}
          >
            <h3>
              Accountability for Others
            </h3>

            <p>
              Review reports from people who
              trust you to hold them accountable.
            </p>

            <p>
              <Link href="/inbox">
                Report Inbox
                {
                  unreadReportCount >
                  0
                    ? ` (${unreadReportCount} unread)`
                    : ""
                }
              </Link>
            </p>

            <p>
              <Link href="/peers">
                Trusted Peers
              </Link>
            </p>
          </div>
        </div>
      </section>


      {/* REPORT PREVIEW */}

      <section
        style={{
          marginTop:
            "30px"
        }}
      >
        <h2>
          Daily Report
        </h2>

        <p>
          Generate today&apos;s preview report for testing.
          Today&apos;s incomplete report is not delivered
          to accountability peers.
        </p>

        <GenerateReportButton />
      </section>


      {/* SETTINGS */}

      <section
        style={{
          marginTop:
            "30px"
        }}
      >
        <h2>
          Settings
        </h2>

        <p>
          <Link href="/devices">
            Devices
          </Link>
        </p>

        <p>
          <Link href="/settings">
            Timezone & Settings
          </Link>
        </p>
      </section>


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
              "20px"
          }}
        >
          <p>
            <strong>
              Status:
            </strong>{" "}
            {current.status}
          </p>

          {
            current.device
              ? (
                <>
                  <p>
                    <strong>
                      Device:
                    </strong>{" "}
                    {
                      current.device.name
                    }
                  </p>

                  <p>
                    <strong>
                      Last heartbeat:
                    </strong>{" "}
                    {
                      current.device.lastSeenAt
                        ? formatDateTime(
                            current.device.lastSeenAt,
                            profile.timezone
                          )
                        : "Never"
                    }
                  </p>
                </>
              )
              : (
                <p>
                  No confirmed, non-revoked
                  tracking device found.
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


      {/* COVERAGE */}

      <section>
        <h2>
          Today&apos;s Tracking Coverage
        </h2>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",

            gap:
              "15px"
          }}
        >
          {
            [
              [
                "Good",
                coverage.goodSeconds
              ],
              [
                "Limited",
                coverage.limitedSeconds
              ],
              [
                "Paused",
                coverage.pausedSeconds
              ],
              [
                "Unknown",
                coverage.unknownSeconds
              ]
            ].map(
              (
                [
                  label,
                  seconds
                ]
              ) => (
                <div
                  key={
                    label as string
                  }
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
                    {label}
                  </h3>

                  <p>
                    {
                      formatDuration(
                        seconds as number
                      )
                    }
                  </p>

                  <p>
                    {
                      formatPercentage(
                        seconds as number,
                        totalCoverage
                      )
                    }
                  </p>
                </div>
              )
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


      {/* USAGE */}

      <section>
        <h2>
          Today&apos;s Usage
        </h2>

        <p>
          <strong>
            Total:
          </strong>{" "}
          {
            formatDuration(
              totalSeconds
            )
          }
        </p>

        <p>
          <strong>
            Active:
          </strong>{" "}
          {
            formatDuration(
              activeSeconds
            )
          }
        </p>

        <p>
          <strong>
            Background audio:
          </strong>{" "}
          {
            formatDuration(
              backgroundSeconds
            )
          }
        </p>

        <h3>
          Site Breakdown
        </h3>

        {
          siteUsage.length ===
            0
            ? (
              <p>
                No tracked usage today.
              </p>
            )
            : (
              <ul>
                {
                  siteUsage.map(
                    (
                      [
                        site,
                        seconds
                      ]
                    ) => (
                      <li
                        key={
                          site
                        }
                      >
                        {site}:{" "}
                        {
                          formatDuration(
                            seconds
                          )
                        }
                      </li>
                    )
                  )
                }
              </ul>
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
          recentActivitySegments.length ===
            0
            ? (
              <p>
                No sessions recorded today.
              </p>
            )
            : (
              recentActivitySegments.map(
                (segment) => (
                  <article
                    key={
                      segment.id
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
                      {segment.site}
                    </strong>

                    <p>
                      Type:{" "}
                      {segment.type}
                    </p>

                    <p>
                      Duration:{" "}
                      {
                        formatDuration(
                          segment.durationSeconds
                        )
                      }
                    </p>

                    <p>
                      Started:{" "}
                      {
                        formatDateTime(
                          segment.startTime,
                          profile.timezone
                        )
                      }
                    </p>


                    <p>
                      Ended:{" "}
                      {
                        formatDateTime(
                          segment.endTime,
                          profile.timezone
                        )
                      }
                    </p>


                    {
                      segment.sessionCount >
                        1 && (
                        <p
                          style={{
                            fontSize:
                              "14px",

                            color:
                              "#666",

                            marginBottom:
                              0
                          }}
                        >
                          Combined from{" "}
                          {segment.sessionCount}{" "}
                          continuous sessions
                        </p>
                      )
                    }
                  </article>
                )
              )
            )
        }
      </section>
    </main>
  );
}
