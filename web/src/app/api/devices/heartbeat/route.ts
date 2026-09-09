import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createHash
} from "node:crypto";

import {
  prisma
} from "@/lib/prisma";


type HeartbeatBody = {
  incognitoEnabled?: unknown;
  eventType?: unknown;
};


const ALLOWED_EVENT_TYPES =
  new Set([
    "heartbeat",
    "tracking_paused",
    "tracking_resumed"
  ]);


// --------------------------------------------------
// DEVICE HEARTBEAT / INTEGRITY EVENT
// --------------------------------------------------

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
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

    const token =
      authorization
        .slice(7)
        .trim();

    if (
      !token
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

    const tokenHash =
      createHash(
        "sha256"
      )
        .update(
          token
        )
        .digest(
          "hex"
        );

    const device =
      await prisma.device.findUnique({
        where: {
          tokenHash
        }
      });

    if (
      !device ||
      device.revokedAt
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid device"
        },
        {
          status:
            401
        }
      );
    }

    let body:
      HeartbeatBody = {};

    try {
      body =
        await request.json() as
          HeartbeatBody;
    } catch {
      // A body is optional.
    }

    const eventType =
      typeof body.eventType ===
        "string"
        ? body.eventType
            .trim()
        : "heartbeat";

    if (
      !ALLOWED_EVENT_TYPES.has(
        eventType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid tracking event type."
        },
        {
          status:
            400
        }
      );
    }

    if (
      body.incognitoEnabled !==
        undefined &&
      typeof body.incognitoEnabled !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "incognitoEnabled must be a boolean."
        },
        {
          status:
            400
        }
      );
    }

    const incognitoEnabled =
      typeof body.incognitoEnabled ===
        "boolean"
        ? body.incognitoEnabled
        : undefined;

    const now =
      new Date();

    const updatedDevice =
      await prisma.device.update({
        where: {
          id:
            device.id
        },

        data: {
          lastSeenAt:
            now,

          confirmedAt:
            device.confirmedAt ??
            now,

          ...(
            incognitoEnabled !==
              undefined
              ? {
                  incognitoEnabled
                }
              : {}
          )
        }
      });

    await prisma.trackingEvent.create({
      data: {
        type:
          eventType,

        createdAt:
          now,

        incognitoEnabled:
          incognitoEnabled ??
          null,

        deviceId:
          device.id
      }
    });

    return NextResponse.json(
      {
        success:
          true,

        deviceId:
          updatedDevice.id,

        lastSeenAt:
          updatedDevice.lastSeenAt,

        incognitoEnabled:
          updatedDevice.incognitoEnabled,

        confirmedAt:
          updatedDevice.confirmedAt
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[API] Heartbeat failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Heartbeat failed."
      },
      {
        status:
          500
      }
    );
  }
}
