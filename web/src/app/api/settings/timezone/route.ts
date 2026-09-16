import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  recordAuditEvent
} from "@/lib/auditLog";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  rateLimitResponse
} from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

import {
  isValidTimeZone
} from "@/lib/reports/reportTime";


export async function POST(
  request: NextRequest
) {

  try {

    // --------------------------------------------------
    // AUTHENTICATE
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

    const rateLimit = await checkRateLimit({
        key:
          `settings:timezone:${user.id}`,
        limit:
          20,
        windowMs:
          60 * 60 * 1000
      });

    if (
      !rateLimit.allowed
    ) {
      return rateLimitResponse(
        rateLimit.retryAfterSeconds
      );
    }


    // --------------------------------------------------
    // READ TIMEZONE
    // --------------------------------------------------

    const body =
      await request.json();


    const timezone =
      typeof body.timezone === "string"
        ? body.timezone.trim()
        : "";


    if (!timezone) {

      return NextResponse.json(
        {
          error:
            "Timezone is required."
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------
    // VALIDATE IANA TIMEZONE
    // --------------------------------------------------

    if (
      !isValidTimeZone(
        timezone
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Invalid timezone."
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------
    // UPDATE USER
    // --------------------------------------------------

    const updatedUser =
      await prisma.user.update({

        where: {
          id:
            user.id
        },

        data: {
          timezone
        },

        select: {
          timezone:
            true
        }

      });


    await recordAuditEvent({
      userId:
        user.id,

      actorUserId:
        user.id,

      action:
        "timezone_changed",

      subjectType:
        "user_settings",

      subjectId:
        user.id,

      metadata: {
        timezone:
          updatedUser.timezone
      }
    });


    return NextResponse.json(
      {
        success:
          true,

        message:
          "Timezone updated.",

        timezone:
          updatedUser.timezone
      },
      {
        status: 200
      }
    );


  } catch (error) {

    console.error(
      "[Settings] Timezone update failed:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Could not update timezone."
      },
      {
        status: 500
      }
    );

  }

}
