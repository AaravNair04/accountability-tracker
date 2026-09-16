-- Lock down public API access to application tables.
--
-- The app reads and writes these tables through server-side Prisma using the
-- database connection, while Supabase's browser client is used only for auth.
-- Enabling RLS with no public policies prevents anon/authenticated API roles
-- from reading or mutating table data via the project URL and anon key.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_peers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracked_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
