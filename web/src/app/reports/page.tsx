import {
  redirect
} from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import RetryReportEmailsButton from "./RetryReportEmailsButton";
import {
  SiteUsageBreakdown,
  TrackingIntegrityBreakdown,
  formatReportDuration
} from "@/components/ReportBreakdowns";
import {
  prisma
} from "@/lib/prisma";
import {
  createClient
} from "@/lib/supabase/server";
import {
  getUserDisplayName,
  getUserSecondaryLabel
} from "@/lib/userDisplay";

function formatDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      year:
        "numeric",
      month:
        "long",
      day:
        "numeric",
      timeZone:
        "UTC"
    }
  );
}

function formatDateTime(
  date: Date
) {
  return date.toLocaleString(
    "en-US",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short"
    }
  );
}

function parseSiteUsage(
  siteUsage: unknown
) {
  return siteUsage &&
    typeof siteUsage ===
      "object" &&
    !Array.isArray(
      siteUsage
    )
    ? siteUsage as Record<string, unknown>
    : {};
}

function getTopSites(
  siteUsage: Record<string, unknown>
) {
  return Object.entries(
    siteUsage
  )
    .filter(
      (entry) =>
        typeof entry[1] ===
          "number" &&
        entry[1] > 0
    )
    .map(
      ([
        site,
        seconds
      ]) => ({
        site,
        seconds:
          seconds as number
      })
    )
    .sort(
      (
        first,
        second
      ) =>
        second.seconds -
        first.seconds
    )
    .slice(
      0,
      3
    );
}

export default async function ReportsPage() {
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

  const reports =
    await prisma.dailyReport.findMany({
      where: {
        userId:
          user.id
      },

      include: {
        deliveries: {
          include: {
            peer: {
              select: {
                email:
                  true,
                username:
                  true
              }
            }
          },

          orderBy: {
            createdAt:
              "asc"
          }
        },

        responses: {
          include: {
            peer: {
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
          }
        }
      },

      orderBy: {
        reportDate:
          "desc"
      }
    });

  await prisma.reportResponse.updateMany({
    where: {
      ownerViewedAt:
        null,

      report: {
        userId:
          user.id
      }
    },

    data: {
      ownerViewedAt:
        new Date()
    }
  });

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Reports"
        title="Daily Reports"
        description="Review your historical accountability reports, peer responses, and tracking coverage in one place."
      />

      {
        reports.length ===
          0
          ? (
            <EmptyState
              title="No daily reports yet"
              description="Your first report will appear here after tracking data is collected and a daily report is generated."
              actionHref="/tracked-sites"
              actionLabel="Check tracked websites"
            />
          )
          : (
            <div className="space-y-5">
              {
                reports.map(
                  (report) => {
                    const siteUsage =
                      parseSiteUsage(
                        report.siteUsage
                      );

                    const topSites =
                      getTopSites(
                        siteUsage
                      );

                    const unsentDeliveries =
                      report.deliveries.filter(
                        (delivery) =>
                          !delivery.emailSentAt
                      );

                    const failedDeliveries =
                      report.deliveries.filter(
                        (delivery) =>
                          delivery.emailFailedAt
                      );

                    const sentDeliveries =
                      report.deliveries.filter(
                        (delivery) =>
                          delivery.emailSentAt
                      );

                    return (
                      <article
                        id={
                          `report-${report.id}`
                        }
                        key={report.id}
                        className="app-card"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                              Accountability report
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                              {
                                formatDate(
                                  report.reportDate
                                )
                              }
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Timezone:{" "}
                              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                                {report.timezone}
                              </strong>
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                              {
                                report.responses.length
                              }{" "}
                              {
                                report.responses.length ===
                                  1
                                  ? "response"
                                  : "responses"
                              }
                            </span>

                            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                              {
                                formatReportDuration(
                                  report.totalSeconds
                                )
                              }{" "}
                              total
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                              Total
                            </p>

                            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                              {
                                formatReportDuration(
                                  report.totalSeconds
                                )
                              }
                            </p>
                          </div>

                          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                              Active
                            </p>

                            <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                              {
                                formatReportDuration(
                                  report.activeSeconds
                                )
                              }
                            </p>
                          </div>

                          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                              Background audio
                            </p>

                            <p className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-100">
                              {
                                formatReportDuration(
                                  report.backgroundAudioSeconds
                                )
                              }
                            </p>
                          </div>
                        </div>

                        {
                          topSites.length >
                            0 && (
                            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Top sites
                              </h3>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {
                                  topSites.map(
                                    (site) => (
                                      <span
                                        key={site.site}
                                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                      >
                                        {site.site}:{" "}
                                        {
                                          formatReportDuration(
                                            site.seconds
                                          )
                                        }
                                      </span>
                                    )
                                  )
                                }
                              </div>
                            </div>
                          )
                        }

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                          <section>
                            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">
                              Site breakdown
                            </h3>

                            <SiteUsageBreakdown
                              siteUsage={siteUsage}
                            />
                          </section>

                          <section>
                            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">
                              Tracking coverage
                            </h3>

                            <TrackingIntegrityBreakdown
                              goodSeconds={
                                report.goodSeconds
                              }
                              limitedSeconds={
                                report.limitedSeconds
                              }
                              pausedSeconds={
                                report.pausedSeconds
                              }
                              unknownSeconds={
                                report.unknownSeconds
                              }
                            />
                          </section>
                        </div>

                        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-950 dark:text-white">
                                Peer email delivery
                              </h3>

                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {
                                  report.deliveries.length ===
                                    0
                                    ? "This report has not been delivered to peers."
                                    : `${sentDeliveries.length} sent, ${unsentDeliveries.length} pending or failed.`
                                }
                              </p>
                            </div>

                            {
                              unsentDeliveries.length >
                                0 && (
                                <RetryReportEmailsButton
                                  reportId={report.id}
                                  unsentCount={
                                    unsentDeliveries.length
                                  }
                                />
                              )
                            }
                          </div>

                          {
                            failedDeliveries.length >
                              0 && (
                              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/40 dark:text-red-200">
                                <p className="font-semibold">
                                  {
                                    failedDeliveries.length
                                  }{" "}
                                  email {
                                    failedDeliveries.length ===
                                      1
                                      ? "failed"
                                      : "failures"
                                  }
                                </p>

                                <ul className="mt-2 space-y-1">
                                  {
                                    failedDeliveries.map(
                                      (delivery) => {
                                        const peerName =
                                          getUserDisplayName(
                                            delivery.peer
                                          );

                                        return (
                                          <li key={delivery.id}>
                                            {peerName}:{" "}
                                            {
                                              delivery.emailFailureReason ??
                                              "Email send failed."
                                            }
                                          </li>
                                        );
                                      }
                                    )
                                  }
                                </ul>
                              </div>
                            )
                          }
                        </section>

                        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                          <h3 className="font-semibold text-slate-950 dark:text-white">
                            Peer responses
                          </h3>

                          {
                            report.responses.length ===
                              0
                              ? (
                                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                                  No peer responses yet.
                                </p>
                              )
                              : (
                                <div className="mt-3 grid gap-3">
                                  {
                                    report.responses.map(
                                      (response) => {
                                        const peerName =
                                          getUserDisplayName(
                                            response.peer
                                          );

                                        const peerSecondary =
                                          getUserSecondaryLabel(
                                            response.peer
                                          );

                                        return (
                                          <div
                                            key={response.id}
                                            className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                                          >
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                              <div>
                                                <strong className="text-slate-950 dark:text-white">
                                                  {peerName}
                                                </strong>

                                                {
                                                  peerSecondary && (
                                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                      {peerSecondary}
                                                    </p>
                                                  )
                                                }
                                              </div>

                                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                                Updated{" "}
                                                {
                                                  formatDateTime(
                                                    response.updatedAt
                                                  )
                                                }
                                              </span>
                                            </div>

                                            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                                              {response.message}
                                            </p>
                                          </div>
                                        );
                                      }
                                    )
                                  }
                                </div>
                              )
                          }
                        </section>
                      </article>
                    );
                  }
                )
              }
            </div>
          )
      }
    </main>
  );
}
