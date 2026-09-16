import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createHash
} from "node:crypto";

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

    const rateLimit = await checkRateLimit({
        key:
          `device:heartbeat:${device.id}`,
        limit:
          180,
        windowMs:
          5 * 60 * 1000
      });

    if (
      !rateLimit.allowed
    ) {
      return rateLimitResponse(
        rateLimit.retryAfterSeconds
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

    const wasUnconfirmed =
      device.confirmedAt ===
      null;

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

    if (
      wasUnconfirmed
    ) {
      await recordAuditEvent({
        userId:
          device.userId,

        action:
          "device_link_confirmed",

        subjectType:
          "device",

        subjectId:
          device.id,

        metadata: {
          deviceName:
            device.name
        }
      });
    }

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
