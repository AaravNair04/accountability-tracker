import ReportCollectionLink from "@/components/ReportCollectionLink";
import {
  redirect
} from "next/navigation";

import PageHeader from "@/components/PageHeader";
import {
  prisma
} from "@/lib/prisma";
import {
  createClient
} from "@/lib/supabase/server";

export default async function ReportsHomePage() {
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
    myReportCount,
    peerReportCount,
    unreadPeerReportCount
  ] =
    await Promise.all([
      prisma.dailyReport.count({
        where: {
          userId:
            user.id
        }
      }),

      prisma.reportDelivery.count({
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
        }
      }),

      prisma.reportDelivery.count({
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
        }
      })
    ]);

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Reports"
        title="Reports"
        description="Choose whether you want to review your own accountability history or reports from peers you support."
      />

      <section aria-label="Report collections" className="grid gap-4 md:grid-cols-2">
        <ReportCollectionLink kind="my" count={myReportCount} />
        <ReportCollectionLink kind="peers" count={peerReportCount} unreadCount={unreadPeerReportCount} />
      </section>
    </main>
  );
}
