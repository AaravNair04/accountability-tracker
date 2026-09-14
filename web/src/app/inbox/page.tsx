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
  createClient
} from "@/lib/supabase/server";

function formatReportDate(
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

export default async function InboxPage() {
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

  const deliveries =
    await prisma.reportDelivery.findMany({
      where: {
        peerId:
          user.id,

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
      },

      include: {
        report: {
          include: {
            user: {
              select: {
                id:
                  true,
                email:
                  true
              }
            }
          }
        }
      },

      orderBy: {
        createdAt:
          "desc"
      }
    });

  const unreadCount =
    deliveries.filter(
      (delivery) =>
        delivery.viewedAt ===
        null
    ).length;

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Peer Reports"
        title="Report Inbox"
        description="Accountability reports shared with you by people you support."
        action={
          <span className="inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
            {unreadCount} unread
          </span>
        }
      />

      {
        deliveries.length ===
          0
          ? (
            <EmptyState
              title="No shared reports yet"
              description="When someone you hold accountable sends a daily report, it will appear here."
              actionHref="/peers"
              actionLabel="View peers"
            />
          )
          : (
            <div className="grid gap-3">
              {
                deliveries.map(
                  (delivery) => {
                    const report =
                      delivery.report;

                    const owner =
                      report.user;

                    const isUnread =
                      delivery.viewedAt ===
                      null;

                    return (
                      <article
                        key={delivery.id}
                        className="app-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-slate-950 dark:text-white">
                              {owner.email}
                            </strong>

                            <span
                              className={
                                [
                                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  isUnread
                                    ? "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200"
                                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
                                ].join(
                                  " "
                                )
                              }
                            >
                              {
                                isUnread
                                  ? "Unread"
                                  : "Read"
                              }
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Report date:{" "}
                            {
                              formatReportDate(
                                report.reportDate
                              )
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Timezone: {report.timezone}
                          </p>
                        </div>

                        <Link
                          href={
                            `/peers/view/${owner.id}/reports/${report.id}`
                          }
                          className="app-button-primary inline-flex justify-center no-underline"
                        >
                          View report
                        </Link>
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
