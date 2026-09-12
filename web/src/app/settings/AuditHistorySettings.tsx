type AuditEvent = {
  id: string;
  action: string;
  subjectType: string;
  createdAt: Date;
  metadata: unknown;
};


type Props = {
  events: AuditEvent[];
  timeZone: string;
};


function formatAction(
  action: string
) {
  return action
    .split(
      "_"
    )
    .map(
      (word) =>
        word.charAt(
          0
        )
          .toUpperCase() +
        word.slice(
          1
        )
    )
    .join(
      " "
    );
}


function formatMetadata(
  metadata: unknown
) {
  if (
    !metadata ||
    typeof metadata !==
      "object" ||
    Array.isArray(
      metadata
    )
  ) {
    return null;
  }

  const entries =
    Object.entries(
      metadata
    ).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined
    );

  if (
    entries.length ===
    0
  ) {
    return null;
  }

  return entries
    .map(
      ([key, value]) =>
        `${key}: ${String(
          value
        )}`
    )
    .join(
      " · "
    );
}


function formatDateTime(
  date: Date,
  timeZone: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      dateStyle:
        "medium",
      timeStyle:
        "short"
    }
  ).format(
    date
  );
}


export default function AuditHistorySettings({
  events,
  timeZone
}: Props) {
  return (
    <section className="app-card">

      <h2 className="app-section-title">
        Audit history
      </h2>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Recent account, sharing, device, and privacy
        changes.
      </p>


      {
        events.length ===
          0
          ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
              No audit events yet.
            </p>
          )
          : (
            <ul
              className="mt-5 grid gap-3"
            >
              {
                events.map(
                  (event) => {
                    const metadata =
                      formatMetadata(
                        event.metadata
                      );

                    return (
                      <li
                        key={event.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                      >
                        <strong className="text-slate-950 dark:text-white">
                          {
                            formatAction(
                              event.action
                            )
                          }
                        </strong>

                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {
                            formatDateTime(
                              event.createdAt,
                              timeZone
                            )
                          }{" "}
                          · {event.subjectType}
                        </div>

                        {
                          metadata && (
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {metadata}
                            </div>
                          )
                        }
                      </li>
                    );
                  }
                )
              }
            </ul>
          )
      }

    </section>
  );
}
