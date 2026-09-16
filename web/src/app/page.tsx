import Link from "next/link";

import {
  redirect
} from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import {
  prisma
} from "@/lib/prisma";
import {
  getUserDisplayName,
  getUserSecondaryLabel
} from "@/lib/userDisplay";

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

function formatTimeRange(
  start: Date,
  end: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        timeStyle:
          "short"
      }
    );

  return `${formatter.format(
    start
  )} - ${formatter.format(
    end
  )}`;
}

function getActivityTypeLabel(
  type: string
) {
  if (
    type ===
    "background_audio"
  ) {
    return "Background audio";
  }

  if (
    type ===
    "active"
  ) {
    return "Active";
  }

  return type;
}

function getActivityTypeClassName(
  type: string
) {
  if (
    type ===
    "active"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (
    type ===
    "background_audio"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
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
    sentPendingInvitationCount,
    accountabilityPeers
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
      }),

      prisma.trustedPeer.findMany({
        where: {
          peerId:
            user.id,

          status:
            "accepted",

          revokedAt:
            null
        },

        include: {
          owner: {
            select: {
              id:
                true,
              email:
                true,
              username:
                true
            }
          }
        },

        orderBy: {
          updatedAt:
            "desc"
        },

        take:
          3
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
      <PageHeader
        eyebrow="Dashboard"
        title="Accountability Tracker"
        description={`Logged in as ${user.email} in ${profile.timezone}.`}
        action={
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
        }
      />

      {/* ACCOUNTABILITY */}

      <section className="space-y-4">
        <h2 className="app-section-title">
          Accountability
        </h2>

        <div className="app-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">
                My Peers
              </h3>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                People you are keeping accountable.
              </p>
            </div>

            <Link
              href="/peers"
              className="app-button-secondary inline-flex justify-center no-underline"
            >
              View all peers
            </Link>
          </div>

          {
            accountabilityPeers.length ===
              0
              ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                  No accepted peer relationships yet.
                </p>
              )
              : (
                <div className="mt-4 grid gap-3">
                  {
                    accountabilityPeers.map(
                      (relationship) => {
                        const peerName =
                          getUserDisplayName(
                            relationship.owner
                          );

                        const peerSecondary =
                          getUserSecondaryLabel(
                            relationship.owner
                          );

                        return (
                          <div
                            key={relationship.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-950 dark:text-white">
                                {peerName}
                              </p>

                              {
                                peerSecondary && (
                                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {peerSecondary}
                                  </p>
                                )
                              }
                            </div>

                            <Link
                              href={
                                `/peers/view/${relationship.owner.id}`
                              }
                              className="app-button-secondary inline-flex items-center justify-center gap-2 no-underline"
                            >
                              <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                              </span>
                              View accountability
                            </Link>
                          </div>
                        );
                      }
                    )
                  }
                </div>
              )
          }
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Today&apos;s total
          </p>

          <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
            {
              formatDuration(
                totalSeconds
              )
            }
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All tracked activity
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Active time
          </p>

          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-300">
            {
              formatDuration(
                activeSeconds
              )
            }
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Focused foreground use
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Distractions
          </p>

          <p className="mt-3 text-2xl font-bold text-red-600 dark:text-red-300">
            {shortActiveDistractionCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Short active bursts
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Tracking status
          </p>

          <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
            {current.status}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {
              current.device
                ? current.device.name
                : "No linked device"
            }
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Needs attention
          </p>

          <p className="mt-3 text-2xl font-bold text-indigo-600 dark:text-indigo-300">
            {notificationCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Peer and report updates
          </p>
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
              <EmptyState
                title="No readable activity blocks yet"
                description="Once a tracked site stays active for 3 minutes or more, it will appear here as a timeline block."
                actionHref="/tracked-sites"
                actionLabel="Manage tracked websites"
              />
            )
            : (
              <div className="relative space-y-3 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {
                  recentActivitySegments.map(
                    (segment) => (
                      <article
                        key={
                          segment.id
                        }
                        className="relative pl-10"
                      >
                        <span className="absolute left-2.5 top-6 h-3 w-3 rounded-full border-2 border-white bg-indigo-600 shadow-sm dark:border-slate-950 dark:bg-indigo-400" />

                        <div className="app-card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-slate-950 dark:text-white">
                                {segment.site}
                              </strong>

                              <span
                                className={
                                  [
                                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    getActivityTypeClassName(
                                      segment.type
                                    )
                                  ].join(
                                    " "
                                  )
                                }
                              >
                                {
                                  getActivityTypeLabel(
                                    segment.type
                                  )
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              {
                                formatTimeRange(
                                  segment.startTime,
                                  segment.endTime,
                                  profile.timezone
                                )
                              }
                            </p>

                            {
                              segment.sessionCount >
                                1 && (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                  Combined from{" "}
                                  {segment.sessionCount}{" "}
                                  continuous sessions
                                </p>
                              )
                            }
                          </div>

                          <p className="text-2xl font-bold text-slate-950 dark:text-white">
                            {
                              formatDuration(
                                segment.durationSeconds
                              )
                            }
                          </p>
                        </div>
                      </article>
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
