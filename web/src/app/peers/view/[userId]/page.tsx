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


type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};


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


export default async function PeerViewPage({
  params
}: PageProps) {
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

  const {
    userId
  } =
    await params;

  const relationship =
    await prisma.trustedPeer.findUnique({
      where: {
        ownerId_peerId: {
          ownerId:
            userId,

          peerId:
            user.id
        }
      },

      include: {
        owner: {
          select: {
            id:
              true,

            email:
              true,

            timezone:
              true
          }
        }
      }
    });

  if (
    !relationship ||
    relationship.status !==
      "accepted"
  ) {
    return (
      <main
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "40px 20px"
        }}
      >
        <Link href="/peers">
          ← Back to Peers
        </Link>

        <h1>
          Access Denied
        </h1>

        <p>
          You are not an accepted accountability
          peer for this user.
        </p>
      </main>
    );
  }

  const owner =
    relationship.owner;

  const now =
    new Date();

  const today =
    getCalendarDateInTimeZone(
      now,
      owner.timezone
    );

  const startOfToday =
    getDayStartUtc(
      today,
      owner.timezone
    );


  // --------------------------------------------------
  // USAGE
  // --------------------------------------------------

  const sessions =
    await prisma.usageSession.findMany({
      where: {
        userId,

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

          return {
            ...session,

            durationSeconds:
              Math.max(
                0,
                Math.floor(
                  (
                    effectiveEnd -
                    effectiveStart
                  ) /
                  1000
                )
              )
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
  // SHARED TRACKING INTEGRITY
  // --------------------------------------------------

  const coverage =
    await calculateTrackingCoverage(
      userId,
      startOfToday,
      now
    );

  const current =
    await getCurrentTrackingStatus(
      userId,
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
          {owner.email}
        </strong>{" "}
        accountable.
      </p>

      <p>
        Their timezone:{" "}
        <strong>
          {owner.timezone}
        </strong>
      </p>

      <Link
        href={
          `/peers/view/${userId}/reports`
        }
      >
        View Daily Reports
      </Link>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


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
                      Last seen:
                    </strong>{" "}
                    {
                      current.device.lastSeenAt
                        ? formatDateTime(
                            current.device.lastSeenAt,
                            owner.timezone
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
                          owner.timezone
                        )
                      }
                    </p>


                    <p>
                      Ended:{" "}
                      {
                        formatDateTime(
                          segment.endTime,
                          owner.timezone
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
