import PageHeader from "@/components/PageHeader";


function MetricSkeleton() {
  return (
    <div className="app-card animate-pulse">
      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-8 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-3 h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}


export default function PeerViewLoading() {
  return (
    <main
      className="app-page space-y-8"
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeader
        backHref="/peers"
        backLabel="← Back to Peers"
        eyebrow="Accountability View"
        title="Loading accountability view"
        description="Fetching today’s tracking status, usage, and delivered reports."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {
          Array.from({
            length:
              5
          }).map(
            (
              _,
              index
            ) => (
              <MetricSkeleton
                key={index}
              />
            )
          )
        }
      </section>

      <section className="app-card animate-pulse">
        <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="app-card h-24 animate-pulse" />
        <div className="app-card h-24 animate-pulse" />
        <div className="app-card h-24 animate-pulse" />
      </section>
    </main>
  );
}
