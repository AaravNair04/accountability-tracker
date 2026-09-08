import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createHash
} from "node:crypto";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


type UsageSession = {
  id: string;
  site: string;
  type: "active" | "background_audio";
  startTime: number;
  endTime: number;
  durationSeconds: number;
};


// Find the identity making this request.
async function getAuthenticatedIdentity(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );


  // Authenticate the Chrome extension.
  // Authenticate the Chrome extension.
if (
  authorization?.startsWith(
    "Bearer "
  )
) {

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


  // A Bearer token was supplied, so it must be
  // a valid and non-revoked extension device.
  if (
    !device ||
    device.revokedAt
  ) {
    return null;
  }


  await prisma.device.update({
    where: {
      id:
        device.id
    },

    data: {
      lastSeenAt:
        new Date()
    }
  });


  return {
    userId:
      device.userId,

    deviceId:
      device.id
  };
}


  // Authenticate a normal website user.
  const supabase =
    await createClient();


  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();


  if (!user) {
    return null;
  }


  return {
    userId:
      user.id,

    deviceId:
      null
  };
}


// Save a usage session.
export async function POST(
  request: NextRequest
) {
  try {
    const identity =
      await getAuthenticatedIdentity(
        request
      );


    if (!identity) {
      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }


    const {
      userId,
      deviceId
    } = identity;


    const session =
      (await request.json()) as UsageSession;


    // Validate required session data.
    if (
      !session.id ||
      !session.site ||
      !session.type ||
      !session.startTime ||
      !session.endTime ||
      session.durationSeconds < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid usage session"
        },
        {
          status: 400
        }
      );
    }


    // Check whether this session was already uploaded.
    const existingSession =
      await prisma.usageSession.findUnique({
        where: {
          id:
            session.id
        }
      });


    if (existingSession) {

      // Prevent another user from reusing this session ID.
      if (
        existingSession.userId !==
        userId
      ) {
        return NextResponse.json(
          {
            error:
              "Session ID already belongs to another user"
          },
          {
            status: 409
          }
        );
      }


      // Retry of an already-saved session.
      return NextResponse.json(
        {
          success: true,
          sessionId:
            existingSession.id
        },
        {
          status: 200
        }
      );
    }


    // Save the new session.
    const savedSession =
      await prisma.usageSession.create({
        data: {
          id:
            session.id,

          site:
            session.site,

          type:
            session.type,

          startTime:
            new Date(
              session.startTime
            ),

          endTime:
            new Date(
              session.endTime
            ),

          durationSeconds:
            session.durationSeconds,

          userId,

          deviceId
        }
      });


    return NextResponse.json(
      {
        success: true,

        sessionId:
          savedSession.id
      },
      {
        status: 201
      }
    );

  } catch (error) {
    console.error(
      "[API] Failed to save usage session:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to save usage session"
      },
      {
        status: 500
      }
    );
  }
}


// Return the logged-in website user's sessions.
export async function GET() {
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


    const sessions =
      await prisma.usageSession.findMany({
        where: {
          userId:
            user.id
        },

        orderBy: {
          startTime:
            "desc"
        },

        take: 100
      });


    return NextResponse.json(
      {
        success: true,

        sessions
      },
      {
        status: 200
      }
    );

  } catch (error) {
    console.error(
      "[API] Failed to fetch usage sessions:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to fetch usage sessions"
      },
      {
        status: 500
      }
    );
  }
}