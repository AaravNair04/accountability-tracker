-- CreateTable
CREATE TABLE "report_responses" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,

    CONSTRAINT "report_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_responses_reportId_idx" ON "report_responses"("reportId");

-- CreateIndex
CREATE INDEX "report_responses_peerId_idx" ON "report_responses"("peerId");

-- CreateIndex
CREATE UNIQUE INDEX "report_responses_reportId_peerId_key" ON "report_responses"("reportId", "peerId");

-- AddForeignKey
ALTER TABLE "report_responses" ADD CONSTRAINT "report_responses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_responses" ADD CONSTRAINT "report_responses_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
