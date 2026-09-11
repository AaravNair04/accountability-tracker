type TrackedSiteConfig = {
  hostname: string;
  site: string;
};


const TRACKED_SITES_KEY =
  "trackedSites";


const DEFAULT_TRACKED_SITES:
  TrackedSiteConfig[] =
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
    ];


let trackedSites =
  createTrackedSiteMap(
    DEFAULT_TRACKED_SITES
  );


function normalizeHostname(
  hostname: string
) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}


function createTrackedSiteMap(
  configs: TrackedSiteConfig[]
) {
  const siteMap =
    new Map<string, string>();

  for (
    const config
    of configs
  ) {
    const hostname =
      normalizeHostname(
        config.hostname
      );

    const site =
      config.site.trim();

    if (
      hostname &&
      site
    ) {
      siteMap.set(
        hostname,
        site
      );
    }
  }

  return siteMap;
}


function parseTrackedSites(
  value: unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return null;
  }

  const configs:
    TrackedSiteConfig[] = [];

  for (
    const item
    of value
  ) {
    if (
      typeof item !==
        "object" ||
      item === null
    ) {
      continue;
    }

    const maybeConfig =
      item as Partial<TrackedSiteConfig>;

    if (
      typeof maybeConfig.hostname ===
        "string" &&
      typeof maybeConfig.site ===
        "string"
    ) {
      configs.push({
        hostname:
          maybeConfig.hostname,

        site:
          maybeConfig.site
      });
    }
  }

  return configs;
}


export async function loadTrackedSites() {
  const stored =
    await chrome.storage.local.get(
      TRACKED_SITES_KEY
    );

  const parsedConfigs =
    parseTrackedSites(
      stored[
        TRACKED_SITES_KEY
      ]
    );

  trackedSites =
    createTrackedSiteMap(
      parsedConfigs ??
      DEFAULT_TRACKED_SITES
    );
}


export async function setTrackedSites(
  configs: TrackedSiteConfig[]
) {
  const parsedConfigs =
    parseTrackedSites(
      configs
    ) ?? [];

  const safeConfigs =
    parsedConfigs.map(
      (config) => ({
        hostname:
          normalizeHostname(
            config.hostname
          ),

        site:
          config.site.trim()
      })
    );

  trackedSites =
    createTrackedSiteMap(
      safeConfigs
    );

  await chrome.storage.local.set({
    [TRACKED_SITES_KEY]:
      safeConfigs
  });
}


export function getTrackedSite(
  url?: string
): string | null {

  if (!url) {
    return null;
  }

  try {

    const parsedUrl = new URL(url);

    let hostname =
      normalizeHostname(
        parsedUrl.hostname
      );

    while (
      hostname
    ) {
      const site =
        trackedSites.get(
          hostname
        );

      if (
        site
      ) {
        return site;
      }

      const nextDotIndex =
        hostname.indexOf(
          "."
        );

      if (
        nextDotIndex ===
          -1
      ) {
        break;
      }

      hostname =
        hostname.slice(
          nextDotIndex + 1
        );
    }

    return null;

  } catch {

    return null;
  }
}
