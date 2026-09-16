import PageHeader from "@/components/PageHeader";

function ReportChoiceSkeleton() {
  return (
    <div className="app-card animate-pulse">
      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-8 w-44 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/80" />
      <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800/80" />
      <div className="mt-6 h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
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
