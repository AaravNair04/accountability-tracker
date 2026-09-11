import {
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


async function getAuthenticatedUserId() {
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


export async function DELETE() {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (
      !userId
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

    const rateLimit =
      checkRateLimit({
        key:
          `tracking-history:delete:${userId}`,
        limit:
          3,
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

    const userDevices =
      await prisma.device.findMany({
        where: {
          userId
        },

        select: {
          id:
            true
        }
      });

    const deviceIds =
      userDevices.map(
        (device) =>
          device.id
      );

    const [
      reportResponses,
      reportDeliveries,
      dailyReports,
      usageSessions,
      trackingEvents
    ] =
      await prisma.$transaction([
        prisma.reportResponse.deleteMany({
          where: {
            report: {
              userId
            }
          }
        }),

        prisma.reportDelivery.deleteMany({
          where: {
            report: {
              userId
            }
          }
        }),

        prisma.dailyReport.deleteMany({
          where: {
            userId
          }
        }),

        prisma.usageSession.deleteMany({
          where: {
            userId
          }
        }),

        prisma.trackingEvent.deleteMany({
          where: {
            deviceId: {
              in:
                deviceIds
            }
          }
        })
      ]);

    await recordAuditEvent({
      userId,

      actorUserId:
        userId,

      action:
        "tracking_history_deleted",

      subjectType:
        "tracking_history",

      subjectId:
        userId,

      metadata: {
        reportResponses:
          reportResponses.count,

        reportDeliveries:
          reportDeliveries.count,

        dailyReports:
          dailyReports.count,

        usageSessions:
          usageSessions.count,

        trackingEvents:
          trackingEvents.count
      }
    });

    return NextResponse.json(
      {
        success:
          true,

        deleted: {
          reportResponses:
            reportResponses.count,

          reportDeliveries:
            reportDeliveries.count,

          dailyReports:
            dailyReports.count,

          usageSessions:
            usageSessions.count,

          trackingEvents:
            trackingEvents.count
        }
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[TrackingHistory] Delete failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete tracking history."
      },
      {
        status:
          500
      }
    );
  }
}
