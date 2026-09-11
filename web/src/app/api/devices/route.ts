import {
  NextResponse
} from "next/server";

import {
  createHash,
  randomBytes
} from "node:crypto";

import {
  recordAuditEvent
} from "@/lib/auditLog";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


// Hash a device token before storing it.
function hashToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}


// Create a device token for the logged-in user.
export async function POST() {
  try {
    const supabase =
      await createClient();


    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();


    if (!user) {
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


    if (!user.email) {
      return NextResponse.json(
        {
          error:
            "User email not available"
        },
        {
          status:
            400
        }
      );
    }


    // Ensure the authenticated user exists in Prisma.
    await prisma.user.upsert({
      where: {
        id:
          user.id
      },

      update: {
        email:
          user.email
      },

      create: {
        id:
          user.id,

        email:
          user.email
      }
    });


    // --------------------------------------------------
    // CLEAN UP ABANDONED DEVICE LINKS
    // --------------------------------------------------

    /*
      A device is created before the extension
      verifies the token with its first heartbeat.

      If that verification never happens,
      confirmedAt remains null.

      Remove old unconfirmed devices so failed
      linking attempts do not accumulate forever.
    */

    const unconfirmedCutoff =
      new Date(
        Date.now() -
        10 * 60 * 1000
      );


    await prisma.device.deleteMany({
      where: {
        userId:
          user.id,

        confirmedAt:
          null,

        createdAt: {
          lt:
            unconfirmedCutoff
        },

        // Only remove abandoned device rows that
        // never produced any historical data.
        trackingEvents: {
          none: {}
        },

        sessions: {
          none: {}
        }
      }
    });


    // --------------------------------------------------
    // CREATE DEVICE TOKEN
    // --------------------------------------------------

    // Generate a high-entropy raw token.
    const token =
      randomBytes(32)
        .toString("hex");


    const tokenHash =
      hashToken(token);


    // --------------------------------------------------
    // CREATE UNCONFIRMED DEVICE
    // --------------------------------------------------

    /*
      confirmedAt remains null until the extension
      successfully sends its first heartbeat.
    */

    const device =
      await prisma.device.create({
        data: {
          name:
            "Chrome Extension",

          tokenHash,

          userId:
            user.id
        }
      });


    await recordAuditEvent({
      userId:
        user.id,

      actorUserId:
        user.id,

      action:
        "device_link_started",

      subjectType:
        "device",

      subjectId:
        device.id,

      metadata: {
        deviceName:
          device.name
      }
    });


    // --------------------------------------------------
    // RETURN TOKEN ONCE
    // --------------------------------------------------

    /*
      Only the hash is stored in the database.

      The raw token is returned once so the
      extension can save and use it.
    */

    return NextResponse.json(
      {
        success:
          true,

        device: {
          id:
            device.id,

          name:
            device.name,

          token
        }
      },
      {
        status:
          201
      }
    );

  } catch (error) {

    console.error(
      "[API] Failed to create device:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to create device"
      },
      {
        status:
          500
      }
    );
  }
}
