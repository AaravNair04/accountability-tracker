const TRACKED_SITES = new Map([
    ["youtube.com", "youtube"],
    ["instagram.com", "instagram"]
]);
export function getTrackedSite(url) {
    if (!url) {
        return null;
    }
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.replace(/^www\./, "");
        const site = TRACKED_SITES.get(hostname);
        return site ?? null;
    }
    catch {
        return null;
    }
}
