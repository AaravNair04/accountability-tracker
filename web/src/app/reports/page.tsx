import Link from "next/link";
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

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/reports/my"
          className="app-card block no-underline transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Your history
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            My Reports
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your daily reports, tracking coverage, peer sharing status, and responses.
          </p>

          <p className="mt-5 text-sm font-semibold text-indigo-700 dark:text-indigo-200">
            {myReportCount} report{myReportCount === 1 ? "" : "s"}
          </p>
        </Link>

        <Link
          href="/reports/peers"
          className="app-card block no-underline transition hover:border-red-200 hover:bg-red-50/40 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
              Live feed
            </p>

            {
              unreadPeerReportCount >
                0 && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>
              )
            }
          </div>

          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            My Peers&apos; Reports
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Reports from people you are keeping accountable.
          </p>

          <p className="mt-5 text-sm font-semibold text-red-700 dark:text-red-200">
            {peerReportCount} report{peerReportCount === 1 ? "" : "s"}
            {
              unreadPeerReportCount >
                0
                ? `, ${unreadPeerReportCount} unread`
                : ""
            }
          </p>
        </Link>
      </section>
    </main>
  );
}
