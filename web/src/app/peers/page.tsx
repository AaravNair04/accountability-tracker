import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import PeerInviteForm from "./PeerInviteForm";
import PeerResponseButtons from "./PeerResponseButtons";


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


  // Keep Supabase Auth and Prisma synchronized.
  await prisma.user.upsert({

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

  });


  // People I invited to hold me accountable.
  const sentInvitations =
    await prisma.trustedPeer.findMany({

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

    });


  // People who asked me to hold them accountable.
  const receivedInvitations =
    await prisma.trustedPeer.findMany({

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

    });


  return (
    <main
      style={{
        maxWidth:
          "800px",

        margin:
          "0 auto",

        padding:
          "40px 20px",

        fontFamily:
          "Arial, sans-serif"
      }}
    >

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1>
        Accountability Peers
      </h1>


      <p>
        Invite people you trust to
        hold you accountable.
      </p>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* INVITE PEER */}

      <section>

        <h2>
          Invite a Peer
        </h2>


        <PeerInviteForm />

      </section>


      <hr
        style={{
          margin:
            "30px 0"
        }}
      />


      {/* PEOPLE HOLDING ME ACCOUNTABLE */}

      <section>

        <h2>
          My Accountability Peers
        </h2>


        {
          sentInvitations.length === 0
            ? (
              <p>
                You haven't invited
                anyone yet.
              </p>
            )
            : (
              <div>

                {
                  sentInvitations.map(
                    (relationship) => (

                      <div
                        key={
                          relationship.id
                        }
                        style={{
                          border:
                            "1px solid #ccc",

                          borderRadius:
                            "8px",

                          padding:
                            "16px",

                          marginBottom:
                            "10px"
                        }}
                      >

                        <strong>
                          {
                            relationship
                              .peer
                              .email
                          }
                        </strong>


                        <p>
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

                            <p>
                              Waiting for this person
                              to accept your invitation.
                            </p>

                          )
                        }


                        {
                          relationship.status ===
                            "accepted" && (

                            <p>
                              This person is holding
                              you accountable.
                            </p>

                          )
                        }


                        {
                          relationship.status ===
                            "rejected" && (

                            <p>
                              This invitation was
                              rejected.
                            </p>

                          )
                        }

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


      {/* PEOPLE I HOLD ACCOUNTABLE */}

      <section>

        <h2>
          People You're Holding Accountable
        </h2>


        {
          receivedInvitations.length === 0
            ? (
              <p>
                No accountability
                invitations yet.
              </p>
            )
            : (
              <div>

                {
                  receivedInvitations.map(
                    (relationship) => (

                      <div
                        key={
                          relationship.id
                        }
                        style={{
                          border:
                            "1px solid #ccc",

                          borderRadius:
                            "8px",

                          padding:
                            "16px",

                          marginBottom:
                            "10px"
                        }}
                      >

                        <strong>
                          {
                            relationship
                              .owner
                              .email
                          }
                        </strong>


                        <p>
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
                            "accepted" && (

                            <Link
                              href={
                                `/peers/view/${relationship.ownerId}`
                              }
                              style={{
                                display:
                                  "inline-block",

                                padding:
                                  "10px 14px",

                                border:
                                  "1px solid #333",

                                borderRadius:
                                  "6px",

                                textDecoration:
                                  "none",

                                marginTop:
                                  "5px"
                              }}
                            >
                              View Accountability
                            </Link>

                          )
                        }


                        {/* Rejected invitation */}

                        {
                          relationship.status ===
                            "rejected" && (

                            <p>
                              You rejected this
                              invitation.
                            </p>

                          )
                        }

                      </div>

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