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

  const rows = [
    {
      label:
        "Good",

      seconds:
        goodSeconds,

      className:
        "bg-emerald-500"
    },
    {
      label:
        "Limited",

      seconds:
        limitedSeconds,

      className:
        "bg-amber-500"
    },
    {
      label:
        "Paused",

      seconds:
        pausedSeconds,

      className:
        "bg-slate-400"
    },
    {
      label:
        "Unknown",

      seconds:
        unknownSeconds,

      className:
        "bg-red-500"
    }
  ];

  return (
    <div className="space-y-3">
      {
        rows.map(
          (row) => (
            <div
              key={
                row.label
              }
            >
              <div
                className="flex items-center justify-between gap-4 text-sm"
              >
                <strong className="text-slate-700 dark:text-slate-200">
                  {row.label}
                </strong>

                <span className="text-slate-500 dark:text-slate-400">
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

              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  className={
                    [
                      "h-full rounded-full",
                      row.className
                    ].join(
                      " "
                    )
                  }
                  style={{
                    width:
                      getBarWidth(
                        row.seconds,
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
