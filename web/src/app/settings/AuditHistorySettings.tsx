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
    <section
      style={{
        marginTop:
          "32px"
      }}
    >

      <h2>
        Audit history
      </h2>


      <p>
        Recent account, sharing, device, and privacy
        changes.
      </p>


      {
        events.length ===
          0
          ? (
            <p>
              No audit events yet.
            </p>
          )
          : (
            <ul
              style={{
                listStyle:
                  "none",
                padding:
                  0,
                margin:
                  0,
                display:
                  "grid",
                gap:
                  "10px"
              }}
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
                        style={{
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "8px",
                          padding:
                            "12px"
                        }}
                      >
                        <strong>
                          {
                            formatAction(
                              event.action
                            )
                          }
                        </strong>

                        <div
                          style={{
                            color:
                              "#666",
                            fontSize:
                              "14px",
                            marginTop:
                              "4px"
                          }}
                        >
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
                            <div
                              style={{
                                color:
                                  "#666",
                                fontSize:
                                  "14px",
                                marginTop:
                                  "4px"
                              }}
                            >
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
