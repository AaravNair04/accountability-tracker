import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  recordAuditEvent
} from "@/lib/auditLog";
import {
  prisma
} from "@/lib/prisma";
import {
  checkRateLimit,
  rateLimitResponse
} from "@/lib/rateLimit";
import {
  createClient
} from "@/lib/supabase/server";


const USERNAME_PATTERN =
  /^[a-z0-9_]{3,24}$/;


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

    const rateLimit =
      checkRateLimit({
        key:
          `settings:username:${user.id}`,
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

    const body =
      await request.json()
        .catch(
          () => ({})
        );

    const rawUsername =
      typeof body.username ===
      "string"
        ? body.username.trim().toLowerCase()
        : null;

    const username =
      rawUsername ||
      null;

    if (
      username &&
      !USERNAME_PATTERN.test(
        username
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-24 lowercase letters, numbers, or underscores."
        },
        {
          status:
            400
        }
      );
    }

    if (
      username
    ) {
      const existingUser =
        await prisma.user.findUnique({
          where: {
            username
          },

          select: {
            id:
              true
          }
        });

      if (
        existingUser &&
        existingUser.id !==
          user.id
      ) {
        return NextResponse.json(
          {
            error:
              "That username is already taken."
          },
          {
            status:
              409
          }
        );
      }
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id:
            user.id
        },

        data: {
          username
        },

        select: {
          username:
            true
        }
      });

    await recordAuditEvent({
      userId:
        user.id,

      actorUserId:
        user.id,

      action:
        "username_changed",

      subjectType:
        "user_settings",

      subjectId:
        user.id,

      metadata: {
        username:
          updatedUser.username
      }
    });

    return NextResponse.json({
      success:
        true,

      message:
        updatedUser.username
          ? "Username updated."
          : "Username removed.",

      username:
        updatedUser.username
    });

  } catch (error) {
    console.error(
      "[Settings] Username update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not update username."
      },
      {
        status:
          500
      }
    );
  }
}
