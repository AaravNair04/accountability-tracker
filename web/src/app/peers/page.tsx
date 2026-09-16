import Link from "next/link";
import { redirect } from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getUserDisplayName,
  getUserSecondaryLabel
} from "@/lib/userDisplay";

import PeerInviteForm from "./PeerInviteForm";
import PeerResponseButtons from "./PeerResponseButtons";
import RemovePeerButton from "./RemovePeerButton";


function formatReportDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }
  );
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
        "short"
    }
  ).format(
    date
  );
}


export default async function PeersPage() {

  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  if (!user.email) {
    throw new Error(
      "Authenticated user does not have an email address."
    );
  }


  const [
    profile,
    sentInvitations,
    receivedInvitations
  ] =
    await Promise.all([
      // Keep Supabase Auth and Prisma synchronized.
      prisma.user.upsert({
        where: {
          id:
            user.id
        },

        update: {
          email:
            user.email.toLowerCase()
        },

        create: {
          id:
            user.id,

          email:
            user.email.toLowerCase()
        }
      }),

      // People I invited to hold me accountable.
      prisma.trustedPeer.findMany({
        where: {
          ownerId:
            user.id
        },

        include: {
          peer:
            true
        },

        orderBy: {
          createdAt:
            "desc"
        }
      }),

      // People who asked me to hold them accountable.
      prisma.trustedPeer.findMany({
        where: {
          peerId:
            user.id
        },

        include: {
          owner:
            true
        },

        orderBy: {
          createdAt:
            "desc"
        }
      })
    ]);


  const sentPeerIds =
    sentInvitations.map(
      (relationship) =>
        relationship.peerId
    );


  const reportDeliveries =
    sentPeerIds.length > 0
      ? await prisma.reportDelivery.findMany({

          where: {
            peerId: {
              in:
                sentPeerIds
            },

            report: {
              userId:
                user.id
            }
          },

          include: {
            report: {
              select: {
                id:
                  true,

                reportDate:
                  true,

                timezone:
                  true,

                responses: {
                  where: {
                    peerId: {
                      in:
                        sentPeerIds
                    }
                  },

                  select: {
                    peerId:
                      true,

                    createdAt:
                      true,

                    updatedAt:
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

        })
      : [];


  const latestDeliveryByPeerId =
    new Map<
      string,
      (typeof reportDeliveries)[number]
    >();


  for (
    const delivery
    of reportDeliveries
  ) {
    if (
      !latestDeliveryByPeerId.has(
        delivery.peerId
      )
    ) {
      latestDeliveryByPeerId.set(
        delivery.peerId,
        delivery
      );
    }
  }

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Peers"
        title="Accountability Peers"
        description="Invite people you trust to hold you accountable and review the people who trust you."
        action={
          <Link
            href="/peers/preview"
            className="app-button-secondary inline-flex no-underline"
          >
            Preview What Peers See
          </Link>
        }
      />


      {/* PEOPLE I HOLD ACCOUNTABLE */}

      <section className="space-y-4">

        <h2 className="app-section-title">
          People You&apos;re Holding Accountable
        </h2>


        {
          receivedInvitations.length === 0
            ? (
              <EmptyState
                title="No one has asked you yet"
                description="When someone invites you to hold them accountable, their request will appear here."
              />
            )
            : (
              <div className="grid gap-3">

                {
                  receivedInvitations.map(
                    (relationship) => {
                      const ownerName =
                        getUserDisplayName(
                          relationship.owner
                        );

                      const ownerSecondary =
                        getUserSecondaryLabel(
                          relationship.owner
                        );

                      return (

                      <div
                        key={
                          relationship.id
                        }
                        className="app-card"
                      >

                        <strong className="text-slate-950 dark:text-white">
                          {ownerName}
                        </strong>

                        {
                          ownerSecondary && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {ownerSecondary}
                            </p>
                          )
                        }

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Status:{" "}

                          <strong>
                            {
                              relationship
                                .status
                            }
                          </strong>
                        </p>


                        {/* Pending invitation */}

                        {
                          relationship.status ===
                            "pending" && (

                            <PeerResponseButtons
                              invitationId={
                                relationship.id
                              }
                            />

                          )
                        }


                        {/* Accepted relationship */}

                        {
                          relationship.status ===
                            "accepted" &&
                          relationship.revokedAt ===
                            null && (

                            <Link
                              href={
                                `/peers/view/${relationship.ownerId}`
                              }
                              className="app-button-primary mt-3 inline-flex no-underline"
                            >
                              View Accountability
                            </Link>

                          )
                        }


                        {
                          (
                            relationship.revokedAt ||
                            relationship.status ===
                              "revoked"
                          ) && (

                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              This accountability
                              relationship was removed.
                            </p>

                          )
                        }


                        {/* Rejected invitation */}

                        {
                          relationship.status ===
                            "rejected" && (

                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              You rejected this
                              invitation.
                            </p>

                          )
                        }

                      </div>

                      );
                    }
                  )
                }

              </div>
            )
        }

      </section>


      {/* PEOPLE HOLDING ME ACCOUNTABLE */}

      <section className="space-y-4">

        <h2 className="app-section-title">
          My Accountability Peers
        </h2>


        {
          sentInvitations.length === 0
            ? (
              <EmptyState
                title="Invite your first accountability peer"
                description="Choose someone you trust so they can view your daily accountability reports."
                actionHref="#invite-peer"
                actionLabel="Invite a Peer"
              />
            )
            : (
              <div className="grid gap-3">

                {
                  sentInvitations.map(
                    (relationship) => {
                      const peerName =
                        getUserDisplayName(
                          relationship.peer
                        );

                      const peerSecondary =
                        getUserSecondaryLabel(
                          relationship.peer
                        );

                      const latestDelivery =
                        latestDeliveryByPeerId.get(
                          relationship.peerId
                        );

                      const latestResponse =
                        latestDelivery
                          ?.report
                          .responses
                          .find(
                            (response) =>
                              response.peerId ===
                              relationship.peerId
                          );

                      return (

                      <div
                        key={
                          relationship.id
                        }
                        className="app-card"
                      >

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

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Status:{" "}

                          <strong>
                            {
                              relationship
                                .status
                            }
                          </strong>
                        </p>


                        {
                          relationship.status ===
                            "pending" && (

                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              Waiting for this person
                              to accept your invitation.
                            </p>

                          )
                        }


                        {
                          relationship.status ===
                            "accepted" &&
                          relationship.revokedAt ===
                            null && (

                            <>
                              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                This person is holding
                                you accountable.
                              </p>


                              <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <p>
                                  <strong>
                                    Latest report:
                                  </strong>{" "}

                                  {
                                    latestDelivery
                                      ? formatReportDate(
                                          latestDelivery
                                            .report
                                            .reportDate
                                        )
                                      : "No completed report delivered yet"
                                  }
                                </p>


                                {
                                  latestDelivery && (
                                    <>
                                      <p className="mt-2">
                                        <strong>
                                          Delivered:
                                        </strong>{" "}

                                        {
                                          formatDateTime(
                                            latestDelivery.createdAt,
                                            profile.timezone
                                          )
                                        }
                                      </p>


                                      <p className="mt-2">
                                        <strong>
                                          Viewed:
                                        </strong>{" "}

                                        {
                                          latestDelivery.viewedAt
                                            ? formatDateTime(
                                                latestDelivery.viewedAt,
                                                profile.timezone
                                              )
                                            : "Not viewed yet"
                                        }
                                      </p>


                                      <p className="mt-2">
                                        <strong>
                                          Response:
                                        </strong>{" "}

                                        {
                                          latestResponse
                                            ? `Received ${formatDateTime(
                                                latestResponse.updatedAt,
                                                profile.timezone
                                              )}`
                                            : "No response yet"
                                        }
                                      </p>


                                      <p className="mt-2">
                                        <Link href="/reports/my">
                                          View report history
                                        </Link>
                                      </p>
                                    </>
                                  )
                                }
                              </div>


                              <RemovePeerButton
                                relationshipId={
                                  relationship.id
                                }

                                peerEmail={
                                  relationship
                                    .peer
                                    .email
                                }
                              />
                            </>

                          )
                        }


                        {
                          relationship.status ===
                            "rejected" && (

                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              This invitation was
                              rejected.
                            </p>

                          )
                        }


                        {
                          (
                            relationship.revokedAt ||
                            relationship.status ===
                              "revoked"
                          ) && (

                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              Access revoked. This peer
                              can no longer view your
                              accountability reports.
                            </p>

                          )
                        }

                      </div>

                      );
                    }
                  )
                }

              </div>
            )
        }

      </section>


      {/* INVITE PEER */}

      <section
        id="invite-peer"
        className="app-card scroll-mt-24"
      >

        <h2 className="app-section-title">
          Invite a Peer
        </h2>


        <div className="mt-4">
          <PeerInviteForm />
        </div>

      </section>

    </main>
  );
}
