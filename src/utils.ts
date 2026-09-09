const TRACKED_SITES = new Map<string, string>([
  ["youtube.com", "youtube"],
  ["instagram.com", "instagram"],
  ["netflix.com", "netflix"]
]);


export function getTrackedSite(
  url?: string
): string | null {

  if (!url) {
    return null;
  }

  try {

    const parsedUrl = new URL(url);

    const hostname =
      parsedUrl.hostname.replace(/^www\./, "");

    const site =
      TRACKED_SITES.get(hostname);

    return site ?? null;

  } catch {

    return null;
  }
}