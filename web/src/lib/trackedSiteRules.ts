export const DEFAULT_TRACKED_SITES =
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
  ] as const;


export function getTrackedSiteExcludedHostnames(
  hostname: string
) {
  const normalizedHostname =
    normalizeHostname(
      hostname
    );

  const defaultTrackedSite =
    DEFAULT_TRACKED_SITES.find(
      (trackedSite) =>
        trackedSite.hostname ===
        normalizedHostname
    );

  if (
    !defaultTrackedSite ||
    !(
      "excludedHostnames" in
      defaultTrackedSite
    )
  ) {
    return [];
  }

  return [
    ...defaultTrackedSite.excludedHostnames
  ];
}


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
