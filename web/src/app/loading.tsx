export default function Loading() {
  return (
    <main
      className="app-page space-y-8"
      aria-busy="true"
      aria-live="polite"
    >
      <section className="app-card overflow-hidden p-0">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-1/3 animate-[loading-progress_1.2s_ease-in-out_infinite] rounded-full bg-indigo-600 dark:bg-indigo-400" />
        </div>

        <div className="p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Loading
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
            Preparing your accountability view
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Fetching the latest usage, reports, and peer status.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {
          Array.from({
            length:
              4
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={index}
                className="app-card animate-pulse"
              >
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-4 h-8 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/80" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/80" />
              </div>
            )
          )
        }
      </section>
    </main>
  );
}
