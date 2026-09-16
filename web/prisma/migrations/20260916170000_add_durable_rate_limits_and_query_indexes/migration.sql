-- Store rate limit buckets in Postgres so limits survive serverless
-- instance churn and apply consistently across concurrent app instances.

CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");

ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;

-- Common usage/report feed lookups filter by owner/peer and time.
CREATE INDEX "usage_sessions_userId_startTime_idx" ON "usage_sessions"("userId", "startTime");
CREATE INDEX "usage_sessions_userId_endTime_idx" ON "usage_sessions"("userId", "endTime");
CREATE INDEX "report_deliveries_peerId_createdAt_idx" ON "report_deliveries"("peerId", "createdAt");
