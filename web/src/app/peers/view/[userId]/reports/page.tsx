import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


type Props = {
  params: Promise<{
    userId: string;
  }>;
};


function formatSeconds(
  seconds: number
) {

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );


  if (hours > 0) {

    return `${hours}h ${minutes}m`;

  }


  if (minutes > 0) {

    return `${minutes}m`;

  }


  return `${seconds}s`;
}


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


export default async function PeerReportsPage({
  params
}: Props) {

  // Get logged-in viewer.
  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // Read target user's ID.
  const {
    userId
  } =
    await params;


  // Verify accepted accountability relationship.
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
            id: true,
            email: true
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "40px 20px"
        }}
      >

        <h1>
          Access Denied
        </h1>


        <p>
          You are not an accepted
          accountability peer for this user.
        </p>


        <Link href="/peers">
          ← Back to Trusted Peers
        </Link>

      </main>
    );

  }


  // Load only reports that were actually delivered to this peer.
  const reports =
    await prisma.dailyReport.findMany({

      where: {

        userId:
          userId,

        deliveries: {

          some: {
            peerId:
              user.id
          }

        }

      },

      orderBy: {
        reportDate:
          "desc"
      }

    });


  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px"
      }}
    >

      <Link
        href={
          `/peers/view/${userId}`
        }
      >
        ← Back to Peer Overview
      </Link>


      <h1>
        Accountability Reports
      </h1>


      <p>
        Reports for{" "}
        <strong>
          {relationship.owner.email}
        </strong>
      </p>


      {
        reports.length === 0
          ? (

            <p>
              No reports have been delivered to you yet.
            </p>

          )
          : (

            reports.map(
              (report) => {

                const coverageTotal =
                  report.goodSeconds +
                  report.limitedSeconds +
                  report.pausedSeconds +
                  report.unknownSeconds;


                const percentage =
                  (
                    seconds: number
                  ) => {

                    if (
                      coverageTotal === 0
                    ) {
                      return 0;
                    }


                    return Math.round(
                      (
                        seconds /
                        coverageTotal
                      ) * 100
                    );

                  };


                const siteUsage =
                  report.siteUsage &&
                  typeof report.siteUsage ===
                    "object" &&
                  !Array.isArray(
                    report.siteUsage
                  )
                    ? report.siteUsage as Record<
                        string,
                        number
                      >
                    : {};


                return (
                  <section
                    key={report.id}
                    style={{
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "10px",
                      padding:
                        "20px",
                      marginTop:
                        "20px"
                    }}
                  >

                    <h2>
                      {
                        formatReportDate(
                          report.reportDate
                        )
                      }
                    </h2>


                    <p>
                      Timezone:{" "}
                      <strong>
                        {report.timezone}
                      </strong>
                    </p>


                    <h3>
                      Usage
                    </h3>


                    <p>
                      Total tracked usage:{" "}
                      <strong>
                        {
                          formatSeconds(
                            report.totalSeconds
                          )
                        }
                      </strong>
                    </p>


                    <p>
                      Active usage:{" "}
                      {
                        formatSeconds(
                          report.activeSeconds
                        )
                      }
                    </p>


                    <p>
                      Background audio:{" "}
                      {
                        formatSeconds(
                          report.backgroundAudioSeconds
                        )
                      }
                    </p>


                    <h3>
                      Site Breakdown
                    </h3>


                    {
                      Object.keys(
                        siteUsage
                      ).length === 0
                        ? (

                          <p>
                            No tracked site usage.
                          </p>

                        )
                        : (

                          <ul>

                            {
                              Object.entries(
                                siteUsage
                              ).map(
                                ([
                                  site,
                                  seconds
                                ]) => (

                                  <li
                                    key={site}
                                  >
                                    {site}:{" "}
                                    {
                                      formatSeconds(
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


                    <h3>
                      Tracking Integrity
                    </h3>


                    <p>
                      Good:{" "}
                      {
                        percentage(
                          report.goodSeconds
                        )
                      }
                      %
                    </p>


                    <p>
                      Limited:{" "}
                      {
                        percentage(
                          report.limitedSeconds
                        )
                      }
                      %
                    </p>


                    <p>
                      Paused:{" "}
                      {
                        percentage(
                          report.pausedSeconds
                        )
                      }
                      %
                    </p>


                    <p>
                      Unknown:{" "}
                      {
                        percentage(
                          report.unknownSeconds
                        )
                      }
                      %
                    </p>


                    <div
                      style={{
                        marginTop:
                          "20px"
                      }}
                    >

                      <Link
                        href={
                          `/peers/view/${userId}/reports/${report.id}`
                        }
                      >
                        View Full Report →
                      </Link>

                    </div>

                  </section>
                );

              }
            )

          )
      }

    </main>
  );
}