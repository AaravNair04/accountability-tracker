import {
  NextRequest,
  NextResponse
} from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

import {
  generateDailyReport
} from "@/lib/reports/generateDailyReport";

import {
  getCalendarDateInTimeZone,
  isValidTimeZone
} from "@/lib/reports/reportTime";

import type {
  CalendarDate
} from "@/lib/reports/reportTime";


export async function POST(
  request: NextRequest
) {

  try {

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

      return NextResponse.json(
        {
          error:
            "You must be logged in."
        },
        {
          status: 401
        }
      );

    }


    // --------------------------------------------------
    // LOAD USER TIMEZONE
    // --------------------------------------------------

    const reportOwner =
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


    if (!reportOwner) {

      return NextResponse.json(
        {
          error:
            "User profile not found."
        },
        {
          status: 404
        }
      );

    }


    if (
      !isValidTimeZone(
        reportOwner.timezone
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Your account has an invalid timezone."
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------
    // DEFAULT TO TODAY IN USER'S TIMEZONE
    // --------------------------------------------------

    let requestedDate:
      CalendarDate =
        getCalendarDateInTimeZone(
          new Date(),
          reportOwner.timezone
        );


    // --------------------------------------------------
    // READ OPTIONAL YYYY-MM-DD
    // --------------------------------------------------

    try {

      const body =
        await request.json();


      if (
        typeof body.date === "string" &&
        body.date.trim()
      ) {

        const dateText =
          body.date.trim();


        // Require YYYY-MM-DD.
        const match =
          dateText.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
          );


        if (!match) {

          return NextResponse.json(
            {
              error:
                "Date must use YYYY-MM-DD format."
            },
            {
              status: 400
            }
          );

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


        // Validate the actual calendar date.
        const validationDate =
          new Date(
            Date.UTC(
              year,
              month - 1,
              day
            )
          );


        if (
          validationDate.getUTCFullYear() !==
            year ||
          validationDate.getUTCMonth() + 1 !==
            month ||
          validationDate.getUTCDate() !==
            day
        ) {

          return NextResponse.json(
            {
              error:
                "Invalid calendar date."
            },
            {
              status: 400
            }
          );

        }


        requestedDate = {
          year,
          month,
          day
        };

      }

    } catch {

      /*
        Empty body is allowed.

        In that case requestedDate remains
        today in the user's timezone.
      */

    }


    // --------------------------------------------------
    // GENERATE REPORT
    // --------------------------------------------------

    const report =
      await generateDailyReport(
        user.id,
        requestedDate
      );


    return NextResponse.json(
      {
        success:
          true,

        message:
          "Daily report generated.",

        report
      },
      {
        status: 200
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
        status: 500
      }
    );

  }

}