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
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  rateLimitResponse
} from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import {
  getEnabledTrackedSites,
  getTrackedSiteExcludedHostnames,
  isValidHostname,
  normalizeHostname,
  siteKeyFromHostname
} from "@/lib/trackedSites";


async function getExtensionUserId(
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

  if (!token) {
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
      },

      select: {
        userId:
          true,

        revokedAt:
          true
      }
    });

  if (
    !device ||
    device.revokedAt
  ) {
    return null;
  }

  return device.userId;
}


async function getWebsiteUserId() {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  return user?.id ?? null;
}


function serializeTrackedSite(
  trackedSite: {
    id: string;
    site: string;
    hostname: string;
    enabled: boolean;
  }
) {
  return {
    id:
      trackedSite.id,

    site:
      trackedSite.site,

    hostname:
      trackedSite.hostname,

    enabled:
      trackedSite.enabled,

    excludedHostnames:
      getTrackedSiteExcludedHostnames(
        trackedSite.hostname
      )
  };
}


export async function GET(
  request: NextRequest
) {
  try {
    const userId =
      await getExtensionUserId(
        request
      ) ??
      await getWebsiteUserId();

    if (!userId) {
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

    const trackedSites =
      await getEnabledTrackedSites(
        userId
      );

    return NextResponse.json(
      {
        success:
          true,

        trackedSites:
          trackedSites.map(
            serializeTrackedSite
          )
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[TrackedSites] GET failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load tracked sites."
      },
      {
        status:
          500
      }
    );
  }
}


export async function POST(
  request: NextRequest
) {
  try {
    const userId =
      await getWebsiteUserId();

    if (!userId) {
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
          `tracked-sites:write:${userId}`,
        limit:
          60,
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
        hostname?: unknown;
      };

    try {
      body =
        await request.json() as {
          hostname?: unknown;
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

    const hostname =
      typeof body.hostname ===
        "string"
        ? normalizeHostname(
            body.hostname
          )
        : "";

    if (
      !isValidHostname(
        hostname
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid hostname, like youtube.com."
        },
        {
          status:
            400
        }
      );
    }

    const site =
      siteKeyFromHostname(
        hostname
      );

    if (!site) {
      return NextResponse.json(
        {
          error:
            "Could not create a site key for this hostname."
        },
        {
          status:
            400
        }
      );
    }

    const trackedSite =
      await prisma.trackedSite.upsert({
        where: {
          userId_hostname: {
            userId,

            hostname
          }
        },

        update: {
          site,

          enabled:
            true
        },

        create: {
          userId,

          hostname,

          site
        }
      });

    await recordAuditEvent({
      userId,

      actorUserId:
        userId,

      action:
        "tracked_site_enabled",

      subjectType:
        "tracked_site",

      subjectId:
        trackedSite.id,

      metadata: {
        hostname:
          trackedSite.hostname,

        site:
          trackedSite.site
      }
    });

    return NextResponse.json(
      {
        success:
          true,

        trackedSite:
          serializeTrackedSite(
            trackedSite
          )
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[TrackedSites] POST failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save tracked site."
      },
      {
        status:
          500
      }
    );
  }
}


export async function DELETE(
  request: NextRequest
) {
  try {
    const userId =
      await getWebsiteUserId();

    if (!userId) {
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
          `tracked-sites:write:${userId}`,
        limit:
          60,
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
        trackedSiteId?: unknown;
      };

    try {
      body =
        await request.json() as {
          trackedSiteId?: unknown;
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

    const trackedSiteId =
      typeof body.trackedSiteId ===
        "string"
        ? body.trackedSiteId.trim()
        : "";

    if (!trackedSiteId) {
      return NextResponse.json(
        {
          error:
            "Tracked site ID is required."
        },
        {
          status:
            400
        }
      );
    }

    const trackedSite =
      await prisma.trackedSite.findUnique({
        where: {
          id:
            trackedSiteId
        }
      });

    if (
      !trackedSite ||
      trackedSite.userId !==
        userId
    ) {
      return NextResponse.json(
        {
          error:
            "Tracked site not found."
        },
        {
          status:
            404
        }
      );
    }

    await prisma.trackedSite.update({
      where: {
        id:
          trackedSite.id
      },

      data: {
        enabled:
          false
      }
    });

    await recordAuditEvent({
      userId,

      actorUserId:
        userId,

      action:
        "tracked_site_disabled",

      subjectType:
        "tracked_site",

      subjectId:
        trackedSite.id,

      metadata: {
        hostname:
          trackedSite.hostname,

        site:
          trackedSite.site
      }
    });

    return NextResponse.json(
      {
        success:
          true
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[TrackedSites] DELETE failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to remove tracked site."
      },
      {
        status:
          500
      }
    );
  }
}
