import {
  prisma
} from "@/lib/prisma";

export async function getNotificationCount(
  userId: string
) {
  const [
    unreadReportCount,
    pendingInvitationCount,
    newPeerResponseCount,
    sentPendingInvitationCount
  ] =
    await Promise.all([
      prisma.reportDelivery.count({
        where: {
          peerId:
            userId,

          viewedAt:
            null,

          report: {
            user: {
              peerRelationships: {
                some: {
                  peerId:
                    userId,

                  status:
                    "accepted",

                  revokedAt:
                    null
                }
              }
            }
          }
        }
      }),

      prisma.trustedPeer.count({
        where: {
          peerId:
            userId,

          status:
            "pending",

          revokedAt:
            null
        }
      }),

      prisma.reportResponse.count({
        where: {
          ownerViewedAt:
            null,

          report: {
            userId
          }
        }
      }),

      prisma.trustedPeer.count({
        where: {
          ownerId:
            userId,

          status:
            "pending",

          revokedAt:
            null
        }
      })
    ]);

  return unreadReportCount +
    pendingInvitationCount +
    newPeerResponseCount +
    sentPendingInvitationCount;
}
