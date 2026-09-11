import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  deleteExpiredRawData,
  isValidRetentionDays
} from "@/lib/dataRetention";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


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

    let body:
      {
        rawDataRetentionDays?: unknown;
      };

    try {
      body =
        await request.json() as {
          rawDataRetentionDays?: unknown;
        };
    } catch {
      return NextResponse.json(
        {
          error:
            "Request body must be valid JSON."
        },
        {
          status:
            400
        }
      );
    }

    const rawDataRetentionDays =
      body.rawDataRetentionDays ===
        null
        ? null
        : typeof body.rawDataRetentionDays ===
            "number"
          ? body.rawDataRetentionDays
          : Number.NaN;

    if (
      !isValidRetentionDays(
        rawDataRetentionDays
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid retention period."
        },
        {
          status:
            400
        }
      );
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id:
            user.id
        },

        data: {
          rawDataRetentionDays
        },

        select: {
          rawDataRetentionDays:
            true
        }
      });

    const cleanupResult =
      rawDataRetentionDays ===
        null
        ? null
        : await deleteExpiredRawData(
            user.id,
            rawDataRetentionDays
          );

    return NextResponse.json(
      {
        success:
          true,

        rawDataRetentionDays:
          updatedUser.rawDataRetentionDays,

        cleanup:
          cleanupResult
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[Settings] Data retention update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not update data retention."
      },
      {
        status:
          500
      }
    );
  }
}
