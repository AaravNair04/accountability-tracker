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

type NotificationCardProps = {
  children: React.ReactNode;
};

function NotificationCard({
  children
}: NotificationCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </article>
  );
}

function SectionEmpty({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
      {children}
    </p>
  );
}

export default async function NotificationsPage() {
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

  const [
    pendingInvitations,
    unreadDeliveries,
    unseenResponses,
    sentPendingInvitations
  ] =
    await Promise.all([
      prisma.trustedPeer.findMany({
        where: {
          peerId:
            user.id,

          status:
            "pending",

          revokedAt:
            null
        },

        include: {
          owner: {
            select: {
              email:
                true
            }
          }
        },

        orderBy: {
          createdAt:
            "desc"
        }
      }),

      prisma.reportDelivery.findMany({
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
      }),

      prisma.reportResponse.findMany({
        where: {
          ownerViewedAt:
            null,

          report: {
            userId:
              user.id
          }
        },

        include: {
          peer: {
            select: {
              email:
                true
            }
          },

          report: {
            select: {
              id:
                true,
              reportDate:
                true
            }
          }
        },

        orderBy: {
          updatedAt:
            "desc"
        }
      }),

      prisma.trustedPeer.findMany({
        where: {
          ownerId:
            user.id,

          status:
            "pending",

          revokedAt:
            null
        },

        include: {
          peer: {
            select: {
              email:
                true
            }
          }
        },

        orderBy: {
          createdAt:
            "desc"
        }
      })
    ]);

  const totalCount =
    pendingInvitations.length +
    unreadDeliveries.length +
    unseenResponses.length +
    sentPendingInvitations.length;

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Notifications"
        title="Notifications"
        description="A single place for invitations, unread peer reports, responses to your reports, and pending accountability updates."
        action={
          <Link
            href="/reports/peers"
            className="app-button-secondary inline-flex no-underline"
          >
            Open peer reports
          </Link>
        }
      />

      {
        totalCount ===
          0
          ? (
            <EmptyState
              title="Nothing needs attention right now"
              description="You are caught up. New invitations, unread peer reports, and responses to your reports will appear here."
              actionHref="/reports/peers"
              actionLabel="Open peer reports"
            />
          )
          : (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              {`${totalCount} item${totalCount === 1 ? "" : "s"} need attention.`}
            </div>
          )
      }

      <section className="space-y-3">
        <h2 className="app-section-title">
          Invitations to Review
        </h2>

        {
          pendingInvitations.length ===
            0
            ? (
              <SectionEmpty>
                No one is waiting for you to accept an accountability invitation.
              </SectionEmpty>
            )
            : pendingInvitations.map(
                (invitation) => (
                  <NotificationCard key={invitation.id}>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <strong className="text-slate-950 dark:text-white">
                        {invitation.owner.email}
                      </strong>{" "}
                      invited you to hold them accountable.
                    </p>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Sent{" "}
                      {
                        formatDateTime(
                          invitation.createdAt
                        )
                      }
                    </p>

                    <Link
                      href="/peers"
                      className="app-button-primary mt-4 inline-flex no-underline"
                    >
                      Review invitation
                    </Link>
                  </NotificationCard>
                )
              )
        }
      </section>

      <section className="space-y-3">
        <h2 className="app-section-title">
          Unread Reports
        </h2>

        {
          unreadDeliveries.length ===
            0
            ? (
              <SectionEmpty>
                No unread reports from people you support.
              </SectionEmpty>
            )
            : unreadDeliveries.map(
                (delivery) => (
                  <NotificationCard key={delivery.id}>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      New report from{" "}
                      <strong className="text-slate-950 dark:text-white">
                        {delivery.report.user.email}
                      </strong>
                    </p>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Report date:{" "}
                      {
                        formatReportDate(
                          delivery.report.reportDate
                        )
                      }
                    </p>

                    <Link
                      href={
                        `/peers/view/${delivery.report.user.id}/reports/${delivery.report.id}`
                      }
                      className="app-button-primary mt-4 inline-flex no-underline"
                    >
                      Open report
                    </Link>
                  </NotificationCard>
                )
              )
        }
      </section>

      <section className="space-y-3">
        <h2 className="app-section-title">
          New Peer Responses
        </h2>

        {
          unseenResponses.length ===
            0
            ? (
              <SectionEmpty>
                No new peer responses to your reports.
              </SectionEmpty>
            )
            : unseenResponses.map(
                (response) => (
                  <NotificationCard key={response.id}>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <strong className="text-slate-950 dark:text-white">
                        {response.peer.email}
                      </strong>{" "}
                      responded to your{" "}
                      {
                        formatReportDate(
                          response.report.reportDate
                        )
                      }{" "}
                      report.
                    </p>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Updated{" "}
                      {
                        formatDateTime(
                          response.updatedAt
                        )
                      }
                    </p>

                    <Link
                      href={
                        `/reports/my#report-${response.report.id}`
                      }
                      className="app-button-primary mt-4 inline-flex no-underline"
                    >
                      View response
                    </Link>
                  </NotificationCard>
                )
              )
        }
      </section>

      <section className="space-y-3">
        <h2 className="app-section-title">
          Invitations You Sent
        </h2>

        {
          sentPendingInvitations.length ===
            0
            ? (
              <SectionEmpty>
                No sent invitations are waiting for acceptance.
              </SectionEmpty>
            )
            : sentPendingInvitations.map(
                (invitation) => (
                  <NotificationCard key={invitation.id}>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      Waiting for{" "}
                      <strong className="text-slate-950 dark:text-white">
                        {invitation.peer.email}
                      </strong>{" "}
                      to accept your invitation.
                    </p>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Sent{" "}
                      {
                        formatDateTime(
                          invitation.createdAt
                        )
                      }
                    </p>

                    <Link
                      href="/peers"
                      className="app-button-primary mt-4 inline-flex no-underline"
                    >
                      View peers
                    </Link>
                  </NotificationCard>
                )
              )
        }
      </section>
    </main>
  );
}
