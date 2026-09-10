import Link from "next/link";
import { redirect } from "next/navigation";

import {
  SiteUsageBreakdown,
  TrackingIntegrityBreakdown,
  formatReportDuration
} from "@/components/ReportBreakdowns";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


type Props = {
  params: Promise<{
    userId: string;
  }>;
};


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
      "accepted" ||
    relationship.revokedAt !==
      null
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
                              formatReportDuration(
                                report.totalSeconds
                              )
                            }
                      </strong>
                    </p>


                    <p>
                      Active usage:{" "}
                      {
                        formatReportDuration(
                          report.activeSeconds
                        )
                      }
                    </p>


                    <p>
                      Background audio:{" "}
                      {
                        formatReportDuration(
                          report.backgroundAudioSeconds
                        )
                      }
                    </p>


                    <h3>
                      Site Breakdown
                    </h3>


                    <SiteUsageBreakdown
                      siteUsage={
                        siteUsage
                      }
                    />


                    <h3>
                      Tracking Integrity
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
