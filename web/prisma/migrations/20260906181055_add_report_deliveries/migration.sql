-- CreateTable
CREATE TABLE "report_deliveries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "reportId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,

    CONSTRAINT "report_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_deliveries_peerId_idx" ON "report_deliveries"("peerId");

-- CreateIndex
CREATE INDEX "report_deliveries_reportId_idx" ON "report_deliveries"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_deliveries_reportId_peerId_key" ON "report_deliveries"("reportId", "peerId");

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
