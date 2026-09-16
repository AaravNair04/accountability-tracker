import PageHeader from "@/components/PageHeader";

function ReportChoiceSkeleton() {
  return (
    <div className="report-choice animate-pulse" aria-hidden="true">
      <div className="size-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3">
        <div className="h-7 w-44 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/80" />
        <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800/80" />
      </div>
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800"><div className="h-8 w-28 rounded bg-slate-200 dark:bg-slate-800" /></div>
    </div>
  );
}

export default function ReportsLoading() {
  return (
    <main
      className="app-page-narrow space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Reports"
        title="Loading Reports"
        description="Preparing your report choices."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <ReportChoiceSkeleton />
        <ReportChoiceSkeleton />
      </section>
    </main>
  );
}
