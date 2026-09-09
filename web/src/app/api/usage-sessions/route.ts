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

import {
  createClient
} from "@/lib/supabase/server";


type UsageSessionBody = {
  id?: unknown;
  site?: unknown;
  type?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  durationSeconds?: unknown;
  deviceId?: unknown;
};


const ALLOWED_SITES =
  new Set([
    "youtube",
    "instagram",
    "netflix"
  ]);


const ALLOWED_TYPES =
  new Set([
    "active",
    "background_audio"
  ]);


const MAX_FUTURE_SKEW_MS =
  10 * 60 * 1000;


// --------------------------------------------------
// EXTENSION AUTH
// --------------------------------------------------

async function getExtensionIdentity(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (
    !token
  ) {
    return null;
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

    authenticatedDeviceId:
      device.id
  };
}


// --------------------------------------------------
// POST - EXTENSION ONLY
// --------------------------------------------------

export async function POST(
  request: NextRequest
) {
  try {
    const identity =
      await getExtensionIdentity(
        request
      );

    if (
      !identity
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

    let body:
      UsageSessionBody;

    try {
      body =
        await request.json() as
          UsageSessionBody;
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

    const id =
      typeof body.id ===
        "string"
        ? body.id.trim()
        : "";

    const site =
      typeof body.site ===
        "string"
        ? body.site.trim()
        : "";

    const type =
      typeof body.type ===
        "string"
        ? body.type.trim()
        : "";

    const startTime =
      typeof body.startTime ===
        "number"
        ? body.startTime
        : Number.NaN;

    const endTime =
      typeof body.endTime ===
        "number"
        ? body.endTime
        : Number.NaN;

    const durationSeconds =
      typeof body.durationSeconds ===
        "number"
        ? body.durationSeconds
        : Number.NaN;

    const requestedSourceDeviceId =
      typeof body.deviceId ===
        "string" &&
      body.deviceId.trim()
        ? body.deviceId.trim()
        : null;

    if (
      !id ||
      id.length > 128 ||
      !ALLOWED_SITES.has(
        site
      ) ||
      !ALLOWED_TYPES.has(
        type
      ) ||
      !Number.isFinite(
        startTime
      ) ||
      !Number.isFinite(
        endTime
      ) ||
      !Number.isInteger(
        durationSeconds
      ) ||
      durationSeconds < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid usage session."
        },
        {
          status:
            400
        }
      );
    }

    if (
      endTime <=
      startTime
    ) {
      return NextResponse.json(
        {
          error:
            "Session endTime must be after startTime."
        },
        {
          status:
            400
        }
      );
    }

    if (
      endTime >
      Date.now() +
        MAX_FUTURE_SKEW_MS
    ) {
      return NextResponse.json(
        {
          error:
            "Session endTime is too far in the future."
        },
        {
          status:
            400
        }
      );
    }

    const calculatedDuration =
      Math.floor(
        (
          endTime -
          startTime
        ) /
        1000
      );

    if (
      calculatedDuration !==
      durationSeconds
    ) {
      return NextResponse.json(
        {
          error:
            "Session duration does not match its timestamps."
        },
        {
          status:
            400
        }
      );
    }

    /*
      A relinked extension may upload a queued
      session created by an older revoked device.

      The current bearer token authenticates the user.
      The historical source device is accepted only
      if it belongs to that same user.
    */
    let sourceDeviceId =
      identity
        .authenticatedDeviceId;

    if (
      requestedSourceDeviceId
    ) {
      const sourceDevice =
        await prisma.device.findUnique({
          where: {
            id:
              requestedSourceDeviceId
          },

          select: {
            id:
              true,

            userId:
              true
          }
        });

      if (
        !sourceDevice ||
        sourceDevice.userId !==
          identity.userId
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid source device."
          },
          {
            status:
              403
          }
        );
      }

      sourceDeviceId =
        sourceDevice.id;
    }

    const existingSession =
      await prisma.usageSession.findUnique({
        where: {
          id
        }
      });

    if (
      existingSession
    ) {
      if (
        existingSession.userId !==
        identity.userId
      ) {
        return NextResponse.json(
          {
            error:
              "Session ID already belongs to another user."
          },
          {
            status:
              409
          }
        );
      }

      const samePayload =
        existingSession.site ===
          site &&
        existingSession.type ===
          type &&
        existingSession.startTime
          .getTime() ===
          startTime &&
        existingSession.endTime
          .getTime() ===
          endTime &&
        existingSession.durationSeconds ===
          durationSeconds &&
        existingSession.deviceId ===
          sourceDeviceId;

      if (
        !samePayload
      ) {
        return NextResponse.json(
          {
            error:
              "Session ID already exists with different data."
          },
          {
            status:
              409
          }
        );
      }

      return NextResponse.json(
        {
          success:
            true,

          sessionId:
            existingSession.id
        },
        {
          status:
            200
        }
      );
    }

    const savedSession =
      await prisma.usageSession.create({
        data: {
          id,

          site,

          type,

          startTime:
            new Date(
              startTime
            ),

          endTime:
            new Date(
              endTime
            ),

          durationSeconds,

          userId:
            identity.userId,

          deviceId:
            sourceDeviceId
        }
      });

    return NextResponse.json(
      {
        success:
          true,

        sessionId:
          savedSession.id
      },
      {
        status:
          201
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
          "Failed to save usage session."
      },
      {
        status:
          500
      }
    );
  }
}


// --------------------------------------------------
// GET - WEBSITE USER
// --------------------------------------------------

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

        take:
          100
      });

    return NextResponse.json(
      {
        success:
          true,

        sessions
      },
      {
        status:
          200
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
          "Failed to fetch usage sessions."
      },
      {
        status:
          500
      }
    );
  }
}
