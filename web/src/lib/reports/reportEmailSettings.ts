export const REPORT_EMAILS_PAUSED_REASON =
  "Peer report email sending is paused until a verified sending domain is configured.";

export function reportEmailDeliveryEnabled() {
  return process.env.REPORT_EMAIL_DELIVERY_ENABLED ===
    "true";
}
