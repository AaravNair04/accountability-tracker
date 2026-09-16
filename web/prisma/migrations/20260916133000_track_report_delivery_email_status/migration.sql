-- Track report email attempts separately from in-app report delivery.
-- A report can be visible to a peer even if Resend rejects or skips email.

ALTER TABLE "report_deliveries"
ADD COLUMN "emailAttemptedAt" TIMESTAMP(3),
ADD COLUMN "emailSentAt" TIMESTAMP(3),
ADD COLUMN "emailSkippedAt" TIMESTAMP(3),
ADD COLUMN "emailFailedAt" TIMESTAMP(3),
ADD COLUMN "emailFailureReason" TEXT;

CREATE INDEX "report_deliveries_emailSentAt_idx" ON "report_deliveries"("emailSentAt");
