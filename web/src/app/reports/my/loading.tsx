import PageHeader from "@/components/PageHeader";

function MyReportSkeleton() {
  return (
    <article className="app-card animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-8 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-40 rounded bg-slate-100 dark:bg-slate-800/80" />
        </div>

        <div className="h-8 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="h-44 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-44 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </article>
  );
}

export default function MyReportsLoading() {
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
        title="Loading My Reports"
        description="Fetching your accountability history and peer responses."
      />

      <section className="space-y-5">
        <MyReportSkeleton />
        <MyReportSkeleton />
      </section>
    </main>
  );
}
