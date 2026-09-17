type TrackedSiteConfig = {
  hostname: string;
  site: string;
  excludedHostnames?: string[];
};

type TrackedSiteRule = {
  site: string;
  excludedHostnames: Set<string>;
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
          "youtube",

        excludedHostnames:
          [
            "music.youtube.com"
          ]
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
    new Map<string, TrackedSiteRule>();

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
        {
          site,

          excludedHostnames:
            new Set(
              (
                config.excludedHostnames ??
                []
              )
                .map(
                  normalizeHostname
                )
                .filter(
                  Boolean
                )
            )
        }
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
          maybeConfig.site,

        excludedHostnames:
          Array.isArray(
            maybeConfig.excludedHostnames
          )
            ? maybeConfig.excludedHostnames.filter(
                (hostname) =>
                  typeof hostname ===
                  "string"
              )
            : undefined
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
          config.site.trim(),

        excludedHostnames:
          (
            config.excludedHostnames ??
            []
          ).map(
            normalizeHostname
          )
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


function hostnameMatches(
  hostname: string,
  pattern: string
) {
  return hostname ===
    pattern ||
    hostname.endsWith(
      `.${pattern}`
    );
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

    const originalHostname =
      hostname;

    while (
      hostname
    ) {
      const rule =
        trackedSites.get(
          hostname
        );

      if (
        rule
      ) {
        for (
          const excludedHostname
          of rule.excludedHostnames
        ) {
          if (
            hostnameMatches(
              originalHostname,
              excludedHostname
            )
          ) {
            return null;
          }
        }

        return rule.site;
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
