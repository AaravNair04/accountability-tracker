import Link from "next/link";
import { redirect } from "next/navigation";

import {
  SiteUsageBreakdown,
  TrackingIntegrityBreakdown,
  formatReportDuration
} from "@/components/ReportBreakdowns";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
      <main className="app-page-narrow space-y-6">

        <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
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

        <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
          Report Not Found
        </h1>

        <Link
          href={
            `/peers/view/${userId}/reports`
          }
        >
          ← Back to Reports
        </Link>

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

        <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
          Access Denied
        </h1>

        <p>
          This report was not delivered
          to your account.
        </p>

        <Link href="/inbox">
          ← Back to Report Inbox
        </Link>

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


  // --------------------------------------------------
  // RENDER PAGE
  // --------------------------------------------------

  return (
    <main className="app-page-narrow space-y-6">

      <Link href="/inbox">
        ← Back to Report Inbox
      </Link>


      <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
        Accountability Report
      </h1>


      <p>
        Shared by{" "}
        <strong>
          {relationship.owner.email}
        </strong>
      </p>


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


      <hr />


      {/* USAGE */}

      <section>

        <h2>
          Usage
        </h2>


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

      </section>


      <hr />


      {/* SITE BREAKDOWN */}

      <section>

        <h2>
          Site Breakdown
        </h2>


        <SiteUsageBreakdown
          siteUsage={
            siteUsage
          }
        />

      </section>


      <hr />


      {/* TRACKING INTEGRITY */}

      <section>

        <h2>
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


      {/* PEER RESPONSE */}

      <ReportResponseForm
        reportId={
          report.id
        }

        initialMessage={
          existingResponse?.message ??
          ""
        }
      />


      <hr />


      <Link
        href={
          `/peers/view/${userId}/reports`
        }
      >
        View all reports from this user
      </Link>

    </main>
  );

}
