import { prisma } from "@/lib/prisma";

export {
  isValidRetentionDays,
  RETENTION_DAY_OPTIONS
} from "@/lib/dataRetentionRules";


export async function deleteExpiredRawData(
  userId: string,
  retentionDays: number
) {
  const cutoff =
    new Date(
      Date.now() -
      retentionDays *
        24 *
        60 *
        60 *
        1000
    );

  const devices =
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
    devices.map(
      (device) =>
        device.id
    );

  const [
    usageSessions,
    trackingEvents
  ] =
    await prisma.$transaction([
      prisma.usageSession.deleteMany({
        where: {
          userId,

          endTime: {
            lt:
              cutoff
          }
        }
      }),

      prisma.trackingEvent.deleteMany({
        where: {
          createdAt: {
            lt:
              cutoff
          },

          deviceId: {
            in:
              deviceIds
          }
        }
      })
    ]);

  return {
    cutoff,

    deleted: {
      usageSessions:
        usageSessions.count,

      trackingEvents:
        trackingEvents.count
    }
  };
}
