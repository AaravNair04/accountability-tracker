import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  prisma
} from "@/lib/prisma";

import {
  deleteExpiredRawData
} from "@/lib/dataRetention";

import {
  generateDailyReport
} from "@/lib/reports/generateDailyReport";

import {
  addCalendarDays,
  formatReportDateKey,
  getCalendarDateInTimeZone,
  isValidTimeZone
} from "@/lib/reports/reportTime";


export async function GET(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    const expectedAuthorization =
      `Bearer ${process.env.CRON_SECRET}`;

    if (
      !process.env.CRON_SECRET ||
      authorization !==
        expectedAuthorization
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized."
        },
        {
          status:
            401
        }
      );
    }

    const now =
      new Date();

    /*
      Only users with at least one confirmed
      tracking device need automatic reports.
    */
    const users =
      await prisma.user.findMany({
        where: {
          devices: {
            some: {
              confirmedAt: {
                not:
                  null
              }
            }
          }
        },

        select: {
          id:
            true,

          email:
            true,

          timezone:
            true,

          rawDataRetentionDays:
            true
        }
      });

    const generatedReports: {
      userId: string;
      email: string;
      timezone: string;
      reportDate: string;
    }[] = [];

    const failures: {
      userId: string;
      email: string;
      error: string;
    }[] = [];

    for (
      const user
      of users
    ) {
      try {
        if (
          !isValidTimeZone(
            user.timezone
          )
        ) {
          throw new Error(
            `Invalid timezone: ${user.timezone}`
          );
        }

        const localToday =
          getCalendarDateInTimeZone(
            now,
            user.timezone
          );

        const localYesterday =
          addCalendarDays(
            localToday,
            -1
          );

        await generateDailyReport(
          user.id,
          localYesterday,
          {
            deliverToPeers:
              true
          }
        );

        if (
          user.rawDataRetentionDays !==
          null
        ) {
          await deleteExpiredRawData(
            user.id,
            user.rawDataRetentionDays
          );
        }

        generatedReports.push({
          userId:
            user.id,

          email:
            user.email,

          timezone:
            user.timezone,

          reportDate:
            formatReportDateKey(
              localYesterday
            )
        });

      } catch (error) {
        console.error(
          `[Cron] Failed report for ${user.id}:`,
          error
        );

        failures.push({
          userId:
            user.id,

          email:
            user.email,

          error:
            error instanceof Error
              ? error.message
              : "Unknown error"
        });
      }
    }

    return NextResponse.json(
      {
        success:
          failures.length ===
          0,

        usersFound:
          users.length,

        generated:
          generatedReports.length,

        failed:
          failures.length,

        reports:
          generatedReports,

        failures
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[Cron] Daily report job failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Daily report job failed."
      },
      {
        status:
          500
      }
    );
  }
}
