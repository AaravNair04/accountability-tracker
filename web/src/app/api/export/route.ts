import {
  NextRequest,
  NextResponse
} from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


function formatExportDate() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}


function toIsoString(
  value: Date | null
) {
  return value
    ? value.toISOString()
    : null;
}


function csvValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value ===
          "object"
        ? JSON.stringify(
            value
          )
        : String(
            value
          );

  if (
    /[",\n\r]/.test(
      text
    )
  ) {
    return `"${text.replace(
      /"/g,
      "\"\""
    )}"`;
  }

  return text;
}


function createCsv(
  headers: string[],
  rows: Record<string, unknown>[]
) {
  return [
    headers.join(
      ","
    ),
    ...rows.map(
      (row) =>
        headers
          .map(
            (header) =>
              csvValue(
                row[
                  header
                ]
              )
          )
          .join(
            ","
          )
    )
  ].join(
    "\n"
  );
}


function downloadHeaders(
  filename: string,
  contentType: string
) {
  return {
    "Content-Disposition":
      `attachment; filename="${filename}"`,

    "Content-Type":
      contentType,

    "Cache-Control":
      "no-store"
  };
}


async function getAuthenticatedUser() {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  return user;
}


export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser();

    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized"
        },
        {
          status:
            401
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const format =
      url.searchParams.get(
        "format"
      ) ?? "json";

    const dataset =
      url.searchParams.get(
        "dataset"
      ) ?? "all";

    const exportDate =
      formatExportDate();

    if (
      format ===
      "csv"
    ) {
      if (
        dataset ===
        "usage-sessions"
      ) {
        const sessions =
          await prisma.usageSession.findMany({
            where: {
              userId:
                user.id
            },

            orderBy: {
              startTime:
                "desc"
            }
          });

        const csv =
          createCsv(
            [
              "id",
              "site",
              "type",
              "startTime",
              "endTime",
              "durationSeconds",
              "createdAt",
              "deviceId"
            ],
            sessions.map(
              (session) => ({
                id:
                  session.id,

                site:
                  session.site,

                type:
                  session.type,

                startTime:
                  session.startTime,

                endTime:
                  session.endTime,

                durationSeconds:
                  session.durationSeconds,

                createdAt:
                  session.createdAt,

                deviceId:
                  session.deviceId
              })
            )
          );

        return new NextResponse(
          csv,
          {
            status:
              200,

            headers:
              downloadHeaders(
                `usage-sessions-${exportDate}.csv`,
                "text/csv; charset=utf-8"
              )
          }
        );
      }

      if (
        dataset ===
        "daily-reports"
      ) {
        const reports =
          await prisma.dailyReport.findMany({
            where: {
              userId:
                user.id
            },

            orderBy: {
              reportDate:
                "desc"
            }
          });

        const csv =
          createCsv(
            [
              "id",
              "reportDate",
              "timezone",
              "createdAt",
              "totalSeconds",
              "activeSeconds",
              "backgroundAudioSeconds",
              "goodSeconds",
              "limitedSeconds",
              "pausedSeconds",
              "unknownSeconds",
              "siteUsage"
            ],
            reports.map(
              (report) => ({
                id:
                  report.id,

                reportDate:
                  report.reportDate,

                timezone:
                  report.timezone,

                createdAt:
                  report.createdAt,

                totalSeconds:
                  report.totalSeconds,

                activeSeconds:
                  report.activeSeconds,

                backgroundAudioSeconds:
                  report.backgroundAudioSeconds,

                goodSeconds:
                  report.goodSeconds,

                limitedSeconds:
                  report.limitedSeconds,

                pausedSeconds:
                  report.pausedSeconds,

                unknownSeconds:
                  report.unknownSeconds,

                siteUsage:
                  report.siteUsage
              })
            )
          );

        return new NextResponse(
          csv,
          {
            status:
              200,

            headers:
              downloadHeaders(
                `daily-reports-${exportDate}.csv`,
                "text/csv; charset=utf-8"
              )
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unsupported CSV dataset."
        },
        {
          status:
            400
        }
      );
    }

    if (
      format !==
      "json"
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported export format."
        },
        {
          status:
            400
        }
      );
    }

    const [
      profile,
      trackedSites,
      devices,
      usageSessions,
      dailyReports,
      peerRelationships,
      accountabilityFor,
      reportDeliveries,
      reportResponses
    ] =
      await Promise.all([
        prisma.user.findUnique({
          where: {
            id:
              user.id
          },

          select: {
            id:
              true,

            email:
              true,

            createdAt:
              true,

            timezone:
              true
          }
        }),

        prisma.trackedSite.findMany({
          where: {
            userId:
              user.id
          },

          orderBy: {
            hostname:
              "asc"
          }
        }),

        prisma.device.findMany({
          where: {
            userId:
              user.id
          },

          select: {
            id:
              true,

            name:
              true,

            createdAt:
              true,

            confirmedAt:
              true,

            lastSeenAt:
              true,

            incognitoEnabled:
              true,

            revokedAt:
              true
          },

          orderBy: {
            createdAt:
              "desc"
          }
        }),

        prisma.usageSession.findMany({
          where: {
            userId:
              user.id
          },

          orderBy: {
            startTime:
              "desc"
          }
        }),

        prisma.dailyReport.findMany({
          where: {
            userId:
              user.id
          },

          orderBy: {
            reportDate:
              "desc"
          }
        }),

        prisma.trustedPeer.findMany({
          where: {
            ownerId:
              user.id
          },

          include: {
            peer: {
              select: {
                id:
                  true,

                email:
                  true
              }
            }
          },

          orderBy: {
            createdAt:
              "desc"
          }
        }),

        prisma.trustedPeer.findMany({
          where: {
            peerId:
              user.id
          },

          include: {
            owner: {
              select: {
                id:
                  true,

                email:
                  true
              }
            }
          },

          orderBy: {
            createdAt:
              "desc"
          }
        }),

        prisma.reportDelivery.findMany({
          where: {
            report: {
              userId:
                user.id
            }
          },

          include: {
            peer: {
              select: {
                id:
                  true,

                email:
                  true
              }
            }
          },

          orderBy: {
            createdAt:
              "desc"
          }
        }),

        prisma.reportResponse.findMany({
          where: {
            OR: [
              {
                peerId:
                  user.id
              },
              {
                report: {
                  userId:
                    user.id
                }
              }
            ]
          },

          include: {
            peer: {
              select: {
                id:
                  true,

                email:
                  true
              }
            },

            report: {
              select: {
                id:
                  true,

                reportDate:
                  true,

                userId:
                  true
              }
            }
          },

          orderBy: {
            createdAt:
              "desc"
          }
        })
      ]);

    const exportPayload =
      {
        exportedAt:
          new Date()
            .toISOString(),

        user:
          profile,

        trackedSites,

        devices,

        usageSessions:
          usageSessions.map(
            (session) => ({
              ...session,

              startTime:
                toIsoString(
                  session.startTime
                ),

              endTime:
                toIsoString(
                  session.endTime
                ),

              createdAt:
                toIsoString(
                  session.createdAt
                )
            })
          ),

        dailyReports:
          dailyReports.map(
            (report) => ({
              ...report,

              reportDate:
                toIsoString(
                  report.reportDate
                ),

              createdAt:
                toIsoString(
                  report.createdAt
                )
            })
          ),

        accountabilityPeers:
          peerRelationships,

        accountabilityFor,

        reportDeliveries,

        reportResponses
      };

    return new NextResponse(
      JSON.stringify(
        exportPayload,
        null,
        2
      ),
      {
        status:
          200,

        headers:
          downloadHeaders(
            `accountability-export-${exportDate}.json`,
            "application/json; charset=utf-8"
          )
      }
    );

  } catch (error) {
    console.error(
      "[Export] Failed to create export:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create export."
      },
      {
        status:
          500
      }
    );
  }
}
