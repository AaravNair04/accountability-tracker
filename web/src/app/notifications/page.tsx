import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


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
    <article
      style={{
        border:
          "1px solid #ddd",

        borderRadius:
          "8px",

        padding:
          "16px",

        marginTop:
          "12px"
      }}
    >
      {children}
    </article>
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
      <Link href="/">
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
        Notifications
      </h1>

      {
        totalCount === 0
          ? (
            <div className="app-card">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No pending notifications right now.
              </p>

              <Link
                href="/inbox"
                className="app-button-primary mt-4 inline-flex no-underline"
              >
                Go to Inbox
              </Link>
            </div>
          )
          : (
            <p>
              {`${totalCount} item${totalCount === 1 ? "" : "s"} need attention.`}
            </p>
          )
      }

      <hr
        style={{
          margin:
            "30px 0"
        }}
      />

      <section>
        <h2>
          Invitations to Review
        </h2>

        {
          pendingInvitations.length ===
            0
            ? (
              <p>
                No pending invitations.
              </p>
            )
            : pendingInvitations.map(
                (invitation) => (
                  <NotificationCard
                    key={
                      invitation.id
                    }
                  >
                    <p>
                      <strong>
                        {invitation.owner.email}
                      </strong>{" "}
                      invited you to hold them
                      accountable.
                    </p>

                    <p>
                      Sent{" "}
                      {
                        formatDateTime(
                          invitation.createdAt
                        )
                      }
                    </p>

                    <Link href="/peers">
                      Review invitation
                    </Link>
                  </NotificationCard>
                )
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
          Unread Reports
        </h2>

        {
          unreadDeliveries.length ===
            0
            ? (
              <p>
                No unread accountability reports.
              </p>
            )
            : unreadDeliveries.map(
                (delivery) => (
                  <NotificationCard
                    key={
                      delivery.id
                    }
                  >
                    <p>
                      New report from{" "}
                      <strong>
                        {delivery.report.user.email}
                      </strong>
                    </p>

                    <p>
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
                    >
                      Open report
                    </Link>
                  </NotificationCard>
                )
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
          New Peer Responses
        </h2>

        {
          unseenResponses.length ===
            0
            ? (
              <p>
                No new responses to your reports.
              </p>
            )
            : unseenResponses.map(
                (response) => (
                  <NotificationCard
                    key={
                      response.id
                    }
                  >
                    <p>
                      <strong>
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

                    <p>
                      Updated{" "}
                      {
                        formatDateTime(
                          response.updatedAt
                        )
                      }
                    </p>

                    <Link
                      href={
                        `/reports#report-${response.report.id}`
                      }
                    >
                      View response
                    </Link>
                  </NotificationCard>
                )
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
          Invitations You Sent
        </h2>

        {
          sentPendingInvitations.length ===
            0
            ? (
              <p>
                No sent invitations are waiting.
              </p>
            )
            : sentPendingInvitations.map(
                (invitation) => (
                  <NotificationCard
                    key={
                      invitation.id
                    }
                  >
                    <p>
                      Waiting for{" "}
                      <strong>
                        {invitation.peer.email}
                      </strong>{" "}
                      to accept your invitation.
                    </p>

                    <p>
                      Sent{" "}
                      {
                        formatDateTime(
                          invitation.createdAt
                        )
                      }
                    </p>

                    <Link href="/peers">
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
