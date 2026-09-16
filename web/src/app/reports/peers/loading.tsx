import PageHeader from "@/components/PageHeader";

function PeerReportRowSkeleton() {
  return (
    <article className="app-card flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800/80" />
        </div>

        <div className="mt-3 h-4 w-56 rounded bg-slate-100 dark:bg-slate-800/80" />
        <div className="mt-2 h-4 w-32 rounded bg-slate-100 dark:bg-slate-800/80" />
      </div>

      <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
    </article>
  );
}

export default function PeerReportsLoading() {
  return (
    <main
      className="app-page-narrow space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeader
        backHref="/reports"
        backLabel="← Back to Reports"
        eyebrow="Reports"
        title="Loading My Peers' Reports"
        description="Fetching reports shared by people you keep accountable."
        action={
          <span className="inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
            Loading
          </span>
        }
      />

      <section className="grid gap-3">
        <PeerReportRowSkeleton />
        <PeerReportRowSkeleton />
        <PeerReportRowSkeleton />
      </section>
    </main>
  );
}
