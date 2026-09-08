import {
  NextRequest,
  NextResponse
} from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


// --------------------------------------------------
// REVOKE DEVICE
// --------------------------------------------------

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


    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }


    const body =
      await request.json();


    const deviceId =
      typeof body.deviceId === "string"
        ? body.deviceId
        : "";


    if (!deviceId) {
      return NextResponse.json(
        {
          error: "Device ID is required"
        },
        {
          status: 400
        }
      );
    }


    const device =
      await prisma.device.findUnique({
        where: {
          id: deviceId
        }
      });


    if (!device) {
      return NextResponse.json(
        {
          error: "Device not found"
        },
        {
          status: 404
        }
      );
    }


    if (
      device.userId !==
      user.id
    ) {
      return NextResponse.json(
        {
          error: "Forbidden"
        },
        {
          status: 403
        }
      );
    }


    if (device.revokedAt) {
      return NextResponse.json(
        {
          error:
            "Device is already revoked"
        },
        {
          status: 409
        }
      );
    }


    await prisma.device.update({
      where: {
        id: device.id
      },

      data: {
        revokedAt:
          new Date()
      }
    });


    return NextResponse.json(
      {
        success: true
      },
      {
        status: 200
      }
    );

  } catch (error) {

    console.error(
      "[API] Failed to revoke device:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to revoke device"
      },
      {
        status: 500
      }
    );
  }
}