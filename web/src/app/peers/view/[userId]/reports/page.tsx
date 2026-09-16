import Link from "next/link";
import { redirect } from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import {
  SiteUsageBreakdown,
  TrackingIntegrityBreakdown,
  formatReportDuration
} from "@/components/ReportBreakdowns";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getUserDisplayName,
  getUserSecondaryLabel
} from "@/lib/userDisplay";


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
            id:
              true,
            email:
              true,
            username:
              true
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
      <main className="app-page-narrow space-y-6">
        <PageHeader
          backHref="/peers"
          backLabel="← Back to Trusted Peers"
          eyebrow="Peer Reports"
          title="Access Denied"
          description="You are not an accepted accountability peer for this user."
        />

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

  const ownerName =
    getUserDisplayName(
      relationship.owner
    );

  const ownerSecondary =
    getUserSecondaryLabel(
      relationship.owner
    );

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref={`/peers/view/${userId}`}
        backLabel="← Back to Peer Overview"
        eyebrow="Peer Reports"
        title="Accountability Reports"
        description={
          ownerSecondary
            ? `Reports for ${ownerName} (${ownerSecondary}).`
            : `Reports for ${ownerName}.`
        }
      />


      {
        reports.length === 0
          ? (
            <EmptyState
              title="No reports delivered yet"
              description="When this person has a delivered daily report, it will appear here."
              actionHref="/reports/peers"
              actionLabel="Open peer reports"
            />

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
                    className="app-card"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Accountability report
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                      {
                        formatReportDate(
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

                      <Link
                        href={
                          `/peers/view/${userId}/reports/${report.id}`
                        }
                        className="app-button-primary inline-flex justify-center no-underline"
                      >
                        View Full Report
                      </Link>
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

                  </section>
                );

              }
            )

          )
      }

    </main>
  );
}
