export default function DataExportSettings() {
  return (
    <section className="app-card">

      <h2 className="app-section-title">
        Data export
      </h2>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Download your usage sessions, reports,
        devices, tracked sites, and accountability
        records.
      </p>


      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="/api/export?format=json"
          className="app-button-secondary no-underline"
        >
          Download full JSON
        </a>

        <a
          href="/api/export?format=csv&dataset=usage-sessions"
          className="app-button-secondary no-underline"
        >
          Usage sessions CSV
        </a>

        <a
          href="/api/export?format=csv&dataset=daily-reports"
          className="app-button-secondary no-underline"
        >
          Daily reports CSV
        </a>
      </div>

    </section>
  );
}
