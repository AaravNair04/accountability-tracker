import {
  NextRequest,
  NextResponse
} from "next/server";

import { prisma } from "@/lib/prisma";

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

    // --------------------------------------------------
    // AUTHORIZE CRON REQUEST
    // --------------------------------------------------

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
          status: 401
        }
      );

    }


    // --------------------------------------------------
    // CURRENT INSTANT
    // --------------------------------------------------

    /*
      This is one absolute moment in time.

      Each user's local calendar date will
      be calculated from this same instant.
    */

    const now =
      new Date();


    // --------------------------------------------------
    // FIND USERS
    // --------------------------------------------------

    const users =
      await prisma.user.findMany({

        where: {

          devices: {
            some: {}
          }

        },

        select: {

          id:
            true,

          email:
            true,

          timezone:
            true

        }

      });


    // --------------------------------------------------
    // GENERATE REPORTS
    // --------------------------------------------------

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

        // ----------------------------------------------
        // VALIDATE USER TIMEZONE
        // ----------------------------------------------

        if (
          !isValidTimeZone(
            user.timezone
          )
        ) {

          throw new Error(
            `Invalid timezone: ${user.timezone}`
          );

        }


        // ----------------------------------------------
        // GET USER'S LOCAL TODAY
        // ----------------------------------------------

        const localToday =
          getCalendarDateInTimeZone(
            now,
            user.timezone
          );


        /*
          Reports are generated for the most
          recently completed local calendar day.

          Example:

          local today = Sep 7

          report date = Sep 6
        */

        const localYesterday =
          addCalendarDays(
            localToday,
            -1
          );


        // ----------------------------------------------
        // GENERATE REPORT
        // ----------------------------------------------

        await generateDailyReport(
          user.id,
          localYesterday
        );


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


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json(
      {

        success:
          failures.length === 0,

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
        status: 200
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
        status: 500
      }
    );

  }

}