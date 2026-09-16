import PageHeader from "@/components/PageHeader";

function PeerCardSkeleton() {
  return (
    <div className="app-card animate-pulse">
      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-3 h-4 w-56 rounded bg-slate-100 dark:bg-slate-800/80" />
      <div className="mt-3 h-4 w-28 rounded bg-slate-100 dark:bg-slate-800/80" />
      <div className="mt-5 h-10 w-40 rounded-lg bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function PeerSectionSkeleton({
  title
}: {
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="app-section-title">
        {title}
      </h2>

      <div className="grid gap-3">
        <PeerCardSkeleton />
        <PeerCardSkeleton />
      </div>
    </section>
  );
}

export default function PeersLoading() {
  return (
    <main
      className="app-page-narrow space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Peers"
        title="Loading accountability peers"
        description="Fetching invitations, peer relationships, and recent report status."
        action={
          <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        }
      />

      <PeerSectionSkeleton title="People You're Holding Accountable" />

      <PeerSectionSkeleton title="My Accountability Peers" />

      <section className="app-card animate-pulse">
        <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-5 h-11 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="mt-3 h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
      </section>
    </main>
  );
}
