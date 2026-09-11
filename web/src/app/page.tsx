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
  countShortActiveUsageSessions,
  MINIMUM_VISIBLE_ACTIVITY_SEGMENT_SECONDS,
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

  const [
    unreadReportCount,
    pendingInvitationCount,
    newPeerResponseCount,
    sentPendingInvitationCount
  ] =
    await Promise.all([
      prisma.reportDelivery.count({
        where: {
          peerId:
            user.id,

          viewedAt:
            null,

          report: {
            user: {
              peerRelationships: {
                some: {
                  peerId:
                    user.id,

                  status:
                    "accepted",

                  revokedAt:
                    null
                }
              }
            }
          }
        }
      }),

      prisma.trustedPeer.count({
        where: {
          peerId:
            user.id,

          status:
            "pending",

          revokedAt:
            null
        }
      }),

      prisma.reportResponse.count({
        where: {
          ownerViewedAt:
            null,

          report: {
            userId:
              user.id
          }
        }
      }),

      prisma.trustedPeer.count({
        where: {
          ownerId:
            user.id,

          status:
            "pending",

          revokedAt:
            null
        }
      })
    ]);

  const notificationCount =
    unreadReportCount +
    pendingInvitationCount +
    newPeerResponseCount +
    sentPendingInvitationCount;

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

  const [
    sessions,
    coverage,
    current
  ] =
    await Promise.all([
      prisma.usageSession.findMany({
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
      }),

      calculateTrackingCoverage(
        user.id,
        startOfToday,
        now
      ),

      getCurrentTrackingStatus(
        user.id,
        now
      )
    ]);

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

  let totalSeconds =
    0;

  let activeSeconds =
    0;

  let backgroundSeconds =
    0;

  const siteTotals =
    new Map<
      string,
      number
    >();

  for (
    const session
    of clippedSessions
  ) {
    totalSeconds +=
      session.durationSeconds;

    if (
      session.type ===
      "active"
    ) {
      activeSeconds +=
        session.durationSeconds;
    }

    if (
      session.type ===
      "background_audio"
    ) {
      backgroundSeconds +=
        session.durationSeconds;
    }

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

  const totalCoverage =
    coverage.goodSeconds +
    coverage.limitedSeconds +
    coverage.pausedSeconds +
    coverage.unknownSeconds;

  const recentActivitySegments =
    groupContinuousUsageSessions(
      clippedSessions,
      {
        minimumSegmentDurationSeconds:
          MINIMUM_VISIBLE_ACTIVITY_SEGMENT_SECONDS
      }
    ).slice(
      0,
      20
    );

  const shortActiveDistractionCount =
    countShortActiveUsageSessions(
      clippedSessions,
      MINIMUM_VISIBLE_ACTIVITY_SEGMENT_SECONDS
    );


  return (
    <main className="app-page space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
            Accountability Tracker
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Logged in as{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">
              {user.email}
            </strong>
            {" "}in{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">
              {profile.timezone}
            </strong>
          </p>
        </div>

        <Link
          href="/notifications"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 no-underline hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
        >
          Notifications
          {
            notificationCount > 0
              ? ` (${notificationCount})`
              : ""
          }
        </Link>
      </section>


      {/* ACCOUNTABILITY */}

      <section className="space-y-4">
        <h2 className="app-section-title">
          Accountability
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-card">
            <h3 className="font-semibold text-slate-950 dark:text-white">
              My Accountability
            </h3>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review your reports and feedback
              from your accountability peers.
            </p>

            <p className="mt-4">
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

          <div className="app-card">
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Accountability for Others
            </h3>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review reports from people who
              trust you to hold them accountable.
            </p>

            <p className="mt-4">
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

      <section className="app-card border-indigo-100 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/10">
        <h2 className="app-section-title">
          Daily Report
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Generate today&apos;s preview report for testing.
          Today&apos;s incomplete report is not delivered
          to accountability peers.
        </p>

        <GenerateReportButton />
      </section>


      {/* SETTINGS */}

      <section className="app-card">
        <h2 className="app-section-title">
          Settings
        </h2>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/devices">
            Devices
          </Link>

          <Link href="/settings">
            Timezone & Settings
          </Link>
        </div>
      </section>


      {/* CURRENT STATUS */}

      <section className="space-y-4">
        <h2 className="app-section-title">
          Current Tracking Status
        </h2>

        <div className="app-card">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong>
              Status:
            </strong>{" "}
            {current.status}
          </p>

          {
            current.device
              ? (
                <>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <strong>
                      Device:
                    </strong>{" "}
                    {
                      current.device.name
                    }
                  </p>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No confirmed, non-revoked
                  tracking device found.
                </p>
              )
          }
        </div>
      </section>


      {/* COVERAGE */}

      <section className="space-y-4">
        <h2 className="app-section-title">
          Today&apos;s Tracking Coverage
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="app-card"
                >
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {label}
                  </h3>

                  <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                    {
                      formatDuration(
                        seconds as number
                      )
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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


      {/* USAGE */}

      <section className="app-card">
        <h2 className="app-section-title">
          Today&apos;s Usage
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <strong>
            Total:
          </strong>{" "}
          {
            formatDuration(
              totalSeconds
            )
          }
          </p>

          <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <strong>
            Active:
          </strong>{" "}
          {
            formatDuration(
              activeSeconds
            )
          }
          </p>

          <p className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <strong>
            Background audio:
          </strong>{" "}
          {
            formatDuration(
              backgroundSeconds
            )
          }
          </p>
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Site Breakdown
        </h3>

        {
          siteUsage.length ===
            0
            ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No tracked usage today.
              </p>
            )
            : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
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
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {site}
                        </span>

                        <span className="text-slate-500 dark:text-slate-400">
                          {
                            formatDuration(
                              seconds
                            )
                          }
                        </span>
                      </li>
                    )
                  )
                }
              </ul>
            )
        }
      </section>


      {/* RECENT ACTIVITY */}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="app-section-title">
          Recent Activity
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Visible blocks show sessions of 3 minutes or more.
            </p>
          </div>

          <p className="inline-flex rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          Short active distractions today:{" "}
          <strong>
            {shortActiveDistractionCount}
          </strong>
          </p>
        </div>

        {
          recentActivitySegments.length ===
            0
            ? (
              <p className="app-card-muted text-sm text-slate-500 dark:text-slate-400">
                No activity blocks over 3 minutes today.
              </p>
            )
            : (
              recentActivitySegments.map(
                (segment) => (
                  <article
                    key={
                      segment.id
                    }
                    className="app-card"
                  >
                    <strong className="text-slate-950 dark:text-white">
                      {segment.site}
                    </strong>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Type:{" "}
                      {segment.type}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Duration:{" "}
                      {
                        formatDuration(
                          segment.durationSeconds
                        )
                      }
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Started:{" "}
                      {
                        formatDateTime(
                          segment.startTime,
                          profile.timezone
                        )
                      }
                    </p>


                    <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
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
