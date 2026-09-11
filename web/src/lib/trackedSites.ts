import { prisma } from "@/lib/prisma";

export {
  DEFAULT_TRACKED_SITES,
  isValidHostname,
  normalizeHostname,
  siteKeyFromHostname
} from "@/lib/trackedSiteRules";

import {
  DEFAULT_TRACKED_SITES
} from "@/lib/trackedSiteRules";


export async function ensureDefaultTrackedSites(
  userId: string
) {
  const existingCount =
    await prisma.trackedSite.count({
      where: {
        userId
      }
    });

  if (
    existingCount > 0
  ) {
    return;
  }

  for (
    const trackedSite
    of DEFAULT_TRACKED_SITES
  ) {
    await prisma.trackedSite.upsert({
      where: {
        userId_hostname: {
          userId,

          hostname:
            trackedSite.hostname
        }
      },

      update: {},

      create: {
        userId,

        hostname:
          trackedSite.hostname,

        site:
          trackedSite.site
      }
    });
  }
}


export async function getEnabledTrackedSites(
  userId: string
) {
  await ensureDefaultTrackedSites(
    userId
  );

  return prisma.trackedSite.findMany({
    where: {
      userId,

      enabled:
        true
    },

    orderBy: {
      hostname:
        "asc"
    }
  });
}
