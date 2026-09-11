import { prisma } from "@/lib/prisma";


export const DEFAULT_TRACKED_SITES =
  [
    {
      hostname:
        "youtube.com",

      site:
        "youtube"
    },
    {
      hostname:
        "instagram.com",

      site:
        "instagram"
    },
    {
      hostname:
        "netflix.com",

      site:
        "netflix"
    }
  ] as const;


export function normalizeHostname(
  value: string
) {
  const trimmedValue =
    value
      .trim()
      .toLowerCase();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl =
      new URL(
        trimmedValue.includes(
          "://"
        )
          ? trimmedValue
          : `https://${trimmedValue}`
      );

    return parsedUrl.hostname
      .replace(
        /^www\./,
        ""
      );

  } catch {
    return trimmedValue
      .replace(
        /^https?:\/\//,
        ""
      )
      .replace(
        /^www\./,
        ""
      )
      .split(
        "/"
      )[0]
      .trim();
  }
}


export function siteKeyFromHostname(
  hostname: string
) {
  return hostname
    .replace(
      /^www\./,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    )
    .slice(
      0,
      64
    );
}


export function isValidHostname(
  hostname: string
) {
  if (
    hostname.length < 3 ||
    hostname.length > 253
  ) {
    return false;
  }

  if (
    !/^[a-z0-9.-]+$/.test(
      hostname
    ) ||
    !hostname.includes(
      "."
    ) ||
    hostname.includes(
      ".."
    )
  ) {
    return false;
  }

  return hostname
    .split(
      "."
    )
    .every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        !label.startsWith(
          "-"
        ) &&
        !label.endsWith(
          "-"
        )
    );
}


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
