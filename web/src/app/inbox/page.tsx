import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


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


export default async function InboxPage() {

  // Get logged-in user.
  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // Load report deliveries for this peer.
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
                id: true,
                email: true
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
        delivery.viewedAt === null
    ).length;


  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px"
      }}
    >

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1>
        Report Inbox
      </h1>


      <p>
        Accountability reports shared
        with you by people you support.
      </p>


      <p>
        <strong>
          Unread reports:
        </strong>{" "}
        {unreadCount}
      </p>


      {
        deliveries.length === 0
          ? (

            <p>
              No reports have been
              delivered to you yet.
            </p>

          )
          : (

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
                  <section
                    key={
                      delivery.id
                    }
                    style={{
                      border:
                        "1px solid #ddd",

                      borderRadius:
                        "10px",

                      padding:
                        "18px",

                      marginTop:
                        "16px"
                    }}
                  >

                    <p>
                      <strong>
                        {owner.email}
                      </strong>
                    </p>


                    <p>
                      Report date:{" "}
                      {
                        formatReportDate(
                          report.reportDate
                        )
                      }
                    </p>


                    <p>
                      Timezone:{" "}
                      {report.timezone}
                    </p>


                    <p>
                      Status:{" "}

                      <strong>
                        {
                          isUnread
                            ? "Unread"
                            : "Read"
                        }
                      </strong>
                    </p>


                    <Link
                        href={
                            `/peers/view/${owner.id}/reports/${report.id}`
                        }
                        >
                        View report
                    </Link>

                  </section>
                );

              }
            )

          )
      }

    </main>
  );
}
