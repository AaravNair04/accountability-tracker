-- Supabase exposes tables in the public schema through PostgREST unless RLS
-- is enabled. Prisma's migration bookkeeping table does not need public access.
--
-- Do not add SELECT/INSERT/UPDATE/DELETE policies here. Application users
-- should not read or mutate Prisma migration history through the public API.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
