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
            "Unauthorized"
        },
        {
          status:
            401
        }
      );
    }

    const rateLimit = await checkRateLimit({
        key:
          `device:rename:${user.id}`,
        limit:
          30,
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

    let body:
      {
        deviceId?: unknown;
        name?: unknown;
      };

    try {
      body =
        await request.json() as {
          deviceId?: unknown;
          name?: unknown;
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

    const deviceId =
      typeof body.deviceId ===
        "string"
        ? body.deviceId.trim()
        : "";

    const name =
      typeof body.name ===
        "string"
        ? body.name.trim()
        : "";

    if (
      !deviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Device ID is required."
        },
        {
          status:
            400
        }
      );
    }

    if (
      !name ||
      name.length > 80
    ) {
      return NextResponse.json(
        {
          error:
            "Device name must be 1 to 80 characters."
        },
        {
          status:
            400
        }
      );
    }

    const device =
      await prisma.device.findUnique({
        where: {
          id:
            deviceId
        }
      });

    if (
      !device
    ) {
      return NextResponse.json(
        {
          error:
            "Device not found."
        },
        {
          status:
            404
        }
      );
    }

    if (
      device.userId !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden"
        },
        {
          status:
            403
        }
      );
    }

    const updatedDevice =
      await prisma.device.update({
        where: {
          id:
            device.id
        },

        data: {
          name
        },

        select: {
          id:
            true,

          name:
            true
        }
      });

    await recordAuditEvent({
      userId:
        user.id,

      actorUserId:
        user.id,

      action:
        "device_renamed",

      subjectType:
        "device",

      subjectId:
        device.id,

      metadata: {
        previousName:
          device.name,

        name:
          updatedDevice.name
      }
    });

    return NextResponse.json(
      {
        success:
          true,

        device:
          updatedDevice
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[API] Failed to rename device:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to rename device."
      },
      {
        status:
          500
      }
    );
  }
}
