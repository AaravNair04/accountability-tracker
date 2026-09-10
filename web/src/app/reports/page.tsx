import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


// --------------------------------------------------
// FORMAT DURATION
// --------------------------------------------------

function formatDuration(
  seconds: number
) {

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );


  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }


  if (minutes > 0) {
    return `${minutes}m`;
  }


  return `${seconds}s`;
}


// --------------------------------------------------
// FORMAT REPORT DATE
// --------------------------------------------------

function formatDate(
  date: Date
) {

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }
  );

}


// --------------------------------------------------
// FORMAT DATE TIME
// --------------------------------------------------

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


// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default async function ReportsPage() {

  // --------------------------------------------------
  // AUTHENTICATE USER
  // --------------------------------------------------

  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // --------------------------------------------------
  // LOAD USER REPORTS + PEER RESPONSES
  // --------------------------------------------------

  const reports =
    await prisma.dailyReport.findMany({

      where: {
        userId:
          user.id
      },

      include: {

        deliveries: {

          include: {

            peer: {
              select: {
                id: true,
                email: true
              }
            }

          },

          orderBy: {
            createdAt:
              "desc"
          }

        },

        responses: {

          include: {

            peer: {
              select: {
                id: true,
                email: true
              }
            }

          },

          orderBy: {
            updatedAt:
              "desc"
          }

        }

      },

      orderBy: {
        reportDate:
          "desc"
      }

    });

    await prisma.reportResponse.updateMany({
      where: {
        ownerViewedAt: null,

        report: {
          userId: user.id
        }
      },

      data: {
        ownerViewedAt: new Date()
      }
    });


  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1>
        Daily Reports
      </h1>


      <p>
        Your historical accountability reports.
      </p>


      <hr
        style={{
          margin: "30px 0"
        }}
      />


      {
        reports.length === 0
          ? (

            <p>
              No daily reports have been generated yet.
            </p>

          )
          : (

            <div>

              {
                reports.map(
                  (report) => {

                    // --------------------------------------------------
                    // COVERAGE TOTAL
                    // --------------------------------------------------

                    const totalCoverage =
                      report.goodSeconds +
                      report.limitedSeconds +
                      report.pausedSeconds +
                      report.unknownSeconds;


                    const goodPercentage =
                      totalCoverage > 0
                        ? Math.round(
                            (
                              report.goodSeconds /
                              totalCoverage
                            ) *
                            100
                          )
                        : 0;


                    const unknownPercentage =
                      totalCoverage > 0
                        ? Math.round(
                            (
                              report.unknownSeconds /
                              totalCoverage
                            ) *
                            100
                          )
                        : 0;


                    // --------------------------------------------------
                    // SITE USAGE
                    // --------------------------------------------------

                    const siteUsage =
                      report.siteUsage &&
                      typeof report.siteUsage ===
                        "object" &&
                      !Array.isArray(
                        report.siteUsage
                      )
                        ? report.siteUsage as Record<
                            string,
                            unknown
                          >
                        : {};


                    const responsesByPeerId =
                      new Map(
                        report.responses.map(
                          (response) => [
                            response.peer.id,
                            response
                          ]
                        )
                      );


                    return (

                      <article
                        key={
                          report.id
                        }

                        style={{
                          border:
                            "1px solid #ccc",

                          borderRadius:
                            "10px",

                          padding:
                            "20px",

                          marginBottom:
                            "20px"
                        }}
                      >

                        {/* REPORT DATE */}

                        <h2>
                          {
                            formatDate(
                              report.reportDate
                            )
                          }
                        </h2>


                        <p>
                          Timezone:{" "}
                          <strong>
                            {
                              report.timezone
                            }
                          </strong>
                        </p>


                        <hr />


                        {/* DELIVERY STATUS */}

                        <h3>
                          Delivery Status
                        </h3>


                        {
                          report.deliveries.length === 0
                            ? (

                              <p>
                                This report has not
                                been delivered to any
                                accountability peers.
                              </p>

                            )
                            : (

                              <div>

                                {
                                  report.deliveries.map(
                                    (delivery) => {
                                      const response =
                                        responsesByPeerId.get(
                                          delivery.peer.id
                                        );

                                      return (

                                        <div
                                          key={
                                            delivery.id
                                          }
                                          style={{
                                            border:
                                              "1px solid #ddd",

                                            borderRadius:
                                              "8px",

                                            padding:
                                              "14px",

                                            marginTop:
                                              "12px"
                                          }}
                                        >

                                          <p>
                                            <strong>
                                              {
                                                delivery
                                                  .peer
                                                  .email
                                              }
                                            </strong>
                                          </p>


                                          <p>
                                            Delivered:{" "}
                                            {
                                              formatDateTime(
                                                delivery.createdAt,
                                                report.timezone
                                              )
                                            }
                                          </p>


                                          <p>
                                            Viewed:{" "}
                                            {
                                              delivery.viewedAt
                                                ? formatDateTime(
                                                    delivery.viewedAt,
                                                    report.timezone
                                                  )
                                                : "Not viewed yet"
                                            }
                                          </p>


                                          <p
                                            style={{
                                              marginBottom:
                                                0
                                            }}
                                          >
                                            Response:{" "}
                                            {
                                              response
                                                ? `Received ${formatDateTime(
                                                    response.updatedAt,
                                                    report.timezone
                                                  )}`
                                                : "No response yet"
                                            }
                                          </p>

                                        </div>

                                      );
                                    }
                                  )
                                }

                              </div>

                            )
                        }


                        <hr />


                        {/* USAGE */}

                        <h3>
                          Usage
                        </h3>


                        <p>
                          <strong>
                            Total:
                          </strong>{" "}

                          {
                            formatDuration(
                              report.totalSeconds
                            )
                          }
                        </p>


                        <p>
                          <strong>
                            Active:
                          </strong>{" "}

                          {
                            formatDuration(
                              report.activeSeconds
                            )
                          }
                        </p>


                        <p>
                          <strong>
                            Background audio:
                          </strong>{" "}

                          {
                            formatDuration(
                              report.backgroundAudioSeconds
                            )
                          }
                        </p>


                        <hr />


                        {/* SITE BREAKDOWN */}

                        <h3>
                          Sites
                        </h3>


                        {
                          Object.keys(
                            siteUsage
                          ).length === 0
                            ? (

                              <p>
                                No tracked site usage.
                              </p>

                            )
                            : (

                              <div>

                                {
                                  Object.entries(
                                    siteUsage
                                  )
                                    .filter(
                                      (
                                        entry
                                      ) =>
                                        typeof entry[1] ===
                                          "number"
                                    )
                                    .sort(
                                      (
                                        first,
                                        second
                                      ) =>
                                        (
                                          second[1] as number
                                        ) -
                                        (
                                          first[1] as number
                                        )
                                    )
                                    .map(
                                      ([
                                        site,
                                        seconds
                                      ]) => (

                                        <div
                                          key={
                                            site
                                          }

                                          style={{
                                            display:
                                              "flex",

                                            justifyContent:
                                              "space-between",

                                            maxWidth:
                                              "400px",

                                            padding:
                                              "5px 0"
                                          }}
                                        >

                                          <span>
                                            {
                                              site
                                            }
                                          </span>


                                          <strong>
                                            {
                                              formatDuration(
                                                seconds as number
                                              )
                                            }
                                          </strong>

                                        </div>

                                      )
                                    )
                                }

                              </div>

                            )
                        }


                        <hr />


                        {/* TRACKING INTEGRITY */}

                        <h3
                          style={{
                            marginTop:
                              "20px"
                          }}
                        >
                          Tracking Integrity
                        </h3>


                        <p>
                          Good:{" "}

                          <strong>
                            {
                              formatDuration(
                                report.goodSeconds
                              )
                            }
                          </strong>

                          {" "}
                          (
                          {
                            goodPercentage
                          }
                          %)
                        </p>


                        <p>
                          Limited:{" "}

                          <strong>
                            {
                              formatDuration(
                                report.limitedSeconds
                              )
                            }
                          </strong>
                        </p>


                        <p>
                          Paused:{" "}

                          <strong>
                            {
                              formatDuration(
                                report.pausedSeconds
                              )
                            }
                          </strong>
                        </p>


                        <p>
                          Unknown:{" "}

                          <strong>
                            {
                              formatDuration(
                                report.unknownSeconds
                              )
                            }
                          </strong>

                          {" "}
                          (
                          {
                            unknownPercentage
                          }
                          %)
                        </p>


                        <hr />


                        {/* PEER RESPONSES */}

                        <h3>
                          Peer Responses
                        </h3>


                        {
                          report.responses.length === 0
                            ? (

                              <p>
                                No peer responses yet.
                              </p>

                            )
                            : (

                              <div>

                                {
                                  report.responses.map(
                                    (
                                      response
                                    ) => (

                                      <div
                                        key={
                                          response.id
                                        }

                                        style={{
                                          border:
                                            "1px solid #ddd",

                                          borderRadius:
                                            "8px",

                                          padding:
                                            "14px",

                                          marginTop:
                                            "12px"
                                        }}
                                      >

                                        <p>
                                          <strong>
                                            {
                                              response.peer.email
                                            }
                                          </strong>
                                        </p>


                                        <p>
                                          {
                                            response.message
                                          }
                                        </p>


                                        <p
                                          style={{
                                            fontSize:
                                              "14px",

                                            marginBottom:
                                              "0"
                                          }}
                                        >
                                          Updated:{" "}
                                          {
                                            response.updatedAt
                                              .toLocaleString()
                                          }
                                        </p>

                                      </div>

                                    )
                                  )
                                }

                              </div>

                            )
                        }

                      </article>

                    );

                  }
                )
              }

            </div>

          )
      }

    </main>
  );

}
