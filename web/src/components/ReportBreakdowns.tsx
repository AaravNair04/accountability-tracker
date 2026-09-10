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
      <p>
        No tracked site usage.
      </p>
    );
  }

  return (
    <div>
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
              style={{
                marginBottom:
                  "12px"
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "16px"
                }}
              >
                <strong>
                  {site}
                </strong>

                <span>
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
                style={{
                  height:
                    "8px",

                  marginTop:
                    "6px",

                  background:
                    "#eee",

                  borderRadius:
                    "999px",

                  overflow:
                    "hidden"
                }}
              >
                <div
                  style={{
                    width:
                      getBarWidth(
                        seconds,
                        totalSeconds
                      ),

                    height:
                      "100%",

                    background:
                      "#333"
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

      color:
        "#237a3b"
    },
    {
      label:
        "Limited",

      seconds:
        limitedSeconds,

      color:
        "#8a6d00"
    },
    {
      label:
        "Paused",

      seconds:
        pausedSeconds,

      color:
        "#666"
    },
    {
      label:
        "Unknown",

      seconds:
        unknownSeconds,

      color:
        "#b00020"
    }
  ];

  return (
    <div>
      {
        rows.map(
          (row) => (
            <div
              key={
                row.label
              }
              style={{
                marginBottom:
                  "12px"
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "16px"
                }}
              >
                <strong>
                  {row.label}
                </strong>

                <span>
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
                style={{
                  height:
                    "8px",

                  marginTop:
                    "6px",

                  background:
                    "#eee",

                  borderRadius:
                    "999px",

                  overflow:
                    "hidden"
                }}
              >
                <div
                  style={{
                    width:
                      getBarWidth(
                        row.seconds,
                        totalSeconds
                      ),

                    height:
                      "100%",

                    background:
                      row.color
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
