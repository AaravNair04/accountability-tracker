import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createClient
} from "@/lib/supabase/server";

import {
  prisma
} from "@/lib/prisma";

import {
  generateDailyReport
} from "@/lib/reports/generateDailyReport";

import {
  formatReportDateKey,
  getCalendarDateInTimeZone,
  isValidTimeZone
} from "@/lib/reports/reportTime";

import type {
  CalendarDate
} from "@/lib/reports/reportTime";


function parseCalendarDate(
  value: string
): CalendarDate | null {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (
    !match
  ) {
    return null;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const validation =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    validation.getUTCFullYear() !==
      year ||
    validation.getUTCMonth() + 1 !==
      month ||
    validation.getUTCDate() !==
      day
  ) {
    return null;
  }

  return {
    year,
    month,
    day
  };
}


export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();

    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be logged in."
        },
        {
          status:
            401
        }
      );
    }

    const profile =
      await prisma.user.findUnique({
        where: {
          id:
            user.id
        },

        select: {
          timezone:
            true
        }
      });

    if (
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "User profile not found."
        },
        {
          status:
            404
        }
      );
    }

    if (
      !isValidTimeZone(
        profile.timezone
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Your account has an invalid timezone."
        },
        {
          status:
            400
        }
      );
    }

    const localToday =
      getCalendarDateInTimeZone(
        new Date(),
        profile.timezone
      );

    let requestedDate =
      localToday;

    try {
      const body =
        await request.json();

      if (
        typeof body.date ===
          "string" &&
        body.date.trim()
      ) {
        const parsedDate =
          parseCalendarDate(
            body.date.trim()
          );

        if (
          !parsedDate
        ) {
          return NextResponse.json(
            {
              error:
                "Date must be a valid YYYY-MM-DD calendar date."
            },
            {
              status:
                400
            }
          );
        }

        requestedDate =
          parsedDate;
      }
    } catch {
      // Empty body is allowed.
    }

    const requestedKey =
      formatReportDateKey(
        requestedDate
      );

    const todayKey =
      formatReportDateKey(
        localToday
      );

    if (
      requestedKey >
      todayKey
    ) {
      return NextResponse.json(
        {
          error:
            "Future reports cannot be generated."
        },
        {
          status:
            400
        }
      );
    }

    /*
      Today's manually generated report is only
      a live preview. It is not delivered to peers.

      Completed historical days can be delivered.
    */
    const completedDay =
      requestedKey <
      todayKey;

    const report =
      await generateDailyReport(
        user.id,
        requestedDate,
        {
          deliverToPeers:
            completedDay
        }
      );

    return NextResponse.json(
      {
        success:
          true,

        message:
          completedDay
            ? "Completed daily report generated."
            : "Today's preview report generated.",

        report
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[Reports] Generation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate daily report."
      },
      {
        status:
          500
      }
    );
  }
}
