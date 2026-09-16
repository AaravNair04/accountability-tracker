type SiteUsageBreakdownProps = {
  siteUsage: Record<string, unknown>;
};


type TrackingIntegrityBreakdownProps = {
  goodSeconds: number;
  limitedSeconds: number;
  pausedSeconds: number;
  unknownSeconds: number;
};


export function formatReportDuration(
  seconds: number
) {
  const hours =
    Math.floor(
      seconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
      60
    );

  const remainingSeconds =
    seconds %
    60;

  if (
    hours > 0
  ) {
    return `${hours}h ${minutes}m`;
  }

  if (
    minutes > 0
  ) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  return `${remainingSeconds}s`;
}


function formatPercentage(
  seconds: number,
  totalSeconds: number
) {
  if (
    totalSeconds <= 0
  ) {
    return "0%";
  }

  return `${Math.round(
    (
      seconds /
      totalSeconds
    ) *
    100
  )}%`;
}


function getBarWidth(
  seconds: number,
  totalSeconds: number
) {
  if (
    totalSeconds <= 0
  ) {
    return "0%";
  }

  return `${Math.max(
    2,
    Math.round(
      (
        seconds /
        totalSeconds
      ) *
      100
    )
  )}%`;
}

const trackingIntegrityRows = [
  {
    label:
      "Good",

    description:
      "Tracking was working normally for this time.",

    color:
      "#10b981",

    dotClassName:
      "bg-emerald-500"
  },
  {
    label:
      "Limited",

    description:
      "Tracking was partially available, so some detail may be missing.",

    color:
      "#f59e0b",

    dotClassName:
      "bg-amber-500"
  },
  {
    label:
      "Paused",

    description:
      "Tracking was intentionally paused or unavailable from the device.",

    color:
      "#94a3b8",

    dotClassName:
      "bg-slate-400"
  },
  {
    label:
      "Unknown",

    description:
      "The app could not verify what happened during this time.",

    color:
      "#ef4444",

    dotClassName:
      "bg-red-500"
  }
] as const;

function getTrackingIntegrityRows({
  goodSeconds,
  limitedSeconds,
  pausedSeconds,
  unknownSeconds
}: TrackingIntegrityBreakdownProps) {
  const values = [
    goodSeconds,
    limitedSeconds,
    pausedSeconds,
    unknownSeconds
  ];

  return trackingIntegrityRows.map(
    (
      row,
      index
    ) => ({
      ...row,
      seconds:
        values[
          index
        ] ?? 0
    })
  );
}

function getPieGradient(
  rows: ReturnType<typeof getTrackingIntegrityRows>,
  totalSeconds: number
) {
  if (
    totalSeconds <= 0
  ) {
    return "#e2e8f0";
  }

  let offset =
    0;

  const segments =
    rows
      .filter(
        (row) =>
          row.seconds > 0
      )
      .map(
        (row) => {
          const start =
            offset;

          const end =
            offset +
            (
              row.seconds /
              totalSeconds
            ) *
              100;

          offset =
            end;

          return `${row.color} ${start}% ${end}%`;
        }
      );

  if (
    segments.length === 0
  ) {
    return "#e2e8f0";
  }

  return `conic-gradient(${segments.join(
    ", "
  )})`;
}

export function TrackingIntegrityLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {
        trackingIntegrityRows.map(
          (row) => (
            <div
              key={row.label}
              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40"
            >
              <span
                className={
                  [
                    "mt-1 h-3 w-3 shrink-0 rounded-full",
                    row.dotClassName
                  ].join(
                    " "
                  )
                }
              />

              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {row.label}
                </p>

                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {row.description}
                </p>
              </div>
            </div>
          )
        )
      }
    </div>
  );
}


export function SiteUsageBreakdown({
  siteUsage
}: SiteUsageBreakdownProps) {
  const sites =
    Object.entries(
      siteUsage
    )
      .filter(
        (
          entry
        ) =>
          typeof entry[1] ===
            "number" &&
          entry[1] > 0
      )
      .map(
        ([
          site,
          seconds
        ]) => ({
          site,
          seconds:
            seconds as number
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          second.seconds -
          first.seconds
      );

  const totalSeconds =
    sites.reduce(
      (
        total,
        site
      ) =>
        total +
        site.seconds,
      0
    );

  if (
    sites.length === 0
  ) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No tracked site usage.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {
        sites.map(
          ({
            site,
            seconds
          }) => (
            <div
              key={
                site
              }
            >
              <div
                className="flex items-center justify-between gap-4 text-sm"
              >
                <strong className="text-slate-700 dark:text-slate-200">
                  {site}
                </strong>

                <span className="text-slate-500 dark:text-slate-400">
                  {
                    formatReportDuration(
                      seconds
                    )
                  }{" "}
                  (
                  {
                    formatPercentage(
                      seconds,
                      totalSeconds
                    )
                  }
                  )
                </span>
              </div>

              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
                  style={{
                    width:
                      getBarWidth(
                        seconds,
                        totalSeconds
                      )
                  }}
                />
              </div>
            </div>
          )
        )
      }
    </div>
  );
}


export function TrackingIntegrityBreakdown({
  goodSeconds,
  limitedSeconds,
  pausedSeconds,
  unknownSeconds
}: TrackingIntegrityBreakdownProps) {
  const totalSeconds =
    goodSeconds +
    limitedSeconds +
    pausedSeconds +
    unknownSeconds;

  const rows =
    getTrackingIntegrityRows({
      goodSeconds,
      limitedSeconds,
      pausedSeconds,
      unknownSeconds
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-[minmax(9rem,12rem)_1fr] sm:items-center">
        <div className="flex justify-center">
          <div
            className="relative h-36 w-36 rounded-full shadow-inner ring-1 ring-slate-200 dark:ring-slate-800"
            role="img"
            aria-label="Tracking coverage pie chart"
            style={{
              background:
                getPieGradient(
                  rows,
                  totalSeconds
                )
            }}
          >
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm dark:bg-slate-950">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Coverage
              </span>

              <strong className="mt-1 text-lg text-slate-950 dark:text-white">
                {
                  formatReportDuration(
                    totalSeconds
                  )
                }
              </strong>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {
            rows.map(
              (row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <span
                      className={
                        [
                          "h-3 w-3 shrink-0 rounded-full",
                          row.dotClassName
                        ].join(
                          " "
                        )
                      }
                    />
                    {row.label}
                  </span>

                  <span className="shrink-0 text-slate-500 dark:text-slate-400">
                    {
                      formatReportDuration(
                        row.seconds
                      )
                    }{" "}
                    (
                    {
                      formatPercentage(
                        row.seconds,
                        totalSeconds
                      )
                    }
                    )
                  </span>
                </div>
              )
            )
          }
        </div>
      </div>

      <TrackingIntegrityLegend />
    </div>
  );
}
