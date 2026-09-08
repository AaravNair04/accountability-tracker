import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createHash
} from "node:crypto";

import { prisma } from "@/lib/prisma";


type HeartbeatBody = {
  incognitoEnabled?: boolean;
  eventType?: string;
};


// Update the device heartbeat.
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
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }


    const token =
      authorization
        .slice(7)
        .trim();


    const tokenHash =
      createHash("sha256")
        .update(token)
        .digest("hex");


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
          error: "Invalid device"
        },
        {
          status: 401
        }
      );
    }


    let body: HeartbeatBody = {};


    try {
      body =
        await request.json();
    } catch {
      // Allow heartbeat requests without a body.
    }


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

          incognitoEnabled:
            body.incognitoEnabled,

          // First successful heartbeat confirms the device.
          confirmedAt:
            device.confirmedAt ??
            now
        }
      });


    await prisma.trackingEvent.create({
      data: {
        type:
          body.eventType ??
          "heartbeat",

        createdAt:
          now,

        incognitoEnabled:
          body.incognitoEnabled,

        deviceId:
          device.id
      }
    });


    return NextResponse.json(
      {
        success: true,

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
        status: 200
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
          "Heartbeat failed"
      },
      {
        status: 500
      }
    );
  }
}