import Link from "next/link";
import { redirect } from "next/navigation";

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

import ReportResponseForm from "./ReportResponseForm";


type Props = {
  params: Promise<{
    userId: string;
    reportId: string;
  }>;
};


// --------------------------------------------------
// FORMAT REPORT DATE
// --------------------------------------------------

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


// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default async function PeerReportPage({
  params
}: Props) {

  // --------------------------------------------------
  // AUTHENTICATE PEER
  // --------------------------------------------------

  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  const {
    userId,
    reportId
  } =
    await params;


  // --------------------------------------------------
  // VERIFY ACCEPTED RELATIONSHIP
  // --------------------------------------------------

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


  // --------------------------------------------------
  // LOAD SPECIFIC REPORT
  // --------------------------------------------------

  const report =
    await prisma.dailyReport.findFirst({

      where: {

        id:
          reportId,

        userId:
          userId

      }

    });


  if (!report) {

    return (
      <main className="app-page-narrow space-y-6">
        <PageHeader
          backHref={`/peers/view/${userId}/reports`}
          backLabel="← Back to Reports"
          eyebrow="Peer Reports"
          title="Report Not Found"
          description="This report could not be found."
        />

      </main>
    );

  }


  // --------------------------------------------------
  // LOAD DELIVERY
  // --------------------------------------------------

  const delivery =
    await prisma.reportDelivery.findUnique({

      where: {

        reportId_peerId: {

          reportId:
            report.id,

          peerId:
            user.id

        }

      }

    });


  // --------------------------------------------------
  // REQUIRE REPORT DELIVERY
  // --------------------------------------------------

  if (!delivery) {

    return (
      <main className="app-page-narrow space-y-6">
        <PageHeader
          backHref="/inbox"
          backLabel="← Back to Report Inbox"
          eyebrow="Peer Reports"
          title="Access Denied"
          description="This report was not delivered to your account."
        />

      </main>
    );

  }


  // --------------------------------------------------
  // MARK ONLY THIS REPORT AS READ
  // --------------------------------------------------

  if (
    delivery.viewedAt === null
  ) {

    await prisma.reportDelivery.update({

      where: {
        id:
          delivery.id
      },

      data: {
        viewedAt:
          new Date()
      }

    });

  }


  // --------------------------------------------------
  // LOAD EXISTING PEER RESPONSE
  // --------------------------------------------------

  const existingResponse =
    await prisma.reportResponse.findUnique({

      where: {

        reportId_peerId: {

          reportId:
            report.id,

          peerId:
            user.id

        }

      },

      select: {
        message:
          true
      }

    });


  // --------------------------------------------------
  // SITE USAGE
  // --------------------------------------------------

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

  const ownerName =
    getUserDisplayName(
      relationship.owner
    );

  const ownerSecondary =
    getUserSecondaryLabel(
      relationship.owner
    );

  // --------------------------------------------------
  // RENDER PAGE
  // --------------------------------------------------

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/inbox"
        backLabel="← Back to Report Inbox"
        eyebrow="Accountability Report"
        title={formatReportDate(
          report.reportDate
        )}
        description={
          ownerSecondary
            ? `Shared by ${ownerName} (${ownerSecondary}). Timezone: ${report.timezone}.`
            : `Shared by ${ownerName}. Timezone: ${report.timezone}.`
        }
        action={
          <Link
            href={`/peers/view/${userId}/reports`}
            className="app-button-secondary inline-flex no-underline"
          >
            View all reports
          </Link>
        }
      />

      <article className="app-card">
        <div className="grid gap-3 sm:grid-cols-3">
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
            <h2 className="mb-3 font-semibold text-slate-950 dark:text-white">
              Site Breakdown
            </h2>

            <SiteUsageBreakdown
              siteUsage={siteUsage}
            />
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-slate-950 dark:text-white">
              Tracking Integrity
            </h2>

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
      </article>

      <ReportResponseForm
        reportId={
          report.id
        }

        initialMessage={
          existingResponse?.message ??
          ""
        }
      />


    </main>
  );

}
