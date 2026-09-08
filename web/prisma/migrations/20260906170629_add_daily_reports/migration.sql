-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "backgroundAudioSeconds" INTEGER NOT NULL DEFAULT 0,
    "goodSeconds" INTEGER NOT NULL DEFAULT 0,
    "limitedSeconds" INTEGER NOT NULL DEFAULT 0,
    "pausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "unknownSeconds" INTEGER NOT NULL DEFAULT 0,
    "siteUsage" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_reportDate_idx" ON "daily_reports"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_userId_reportDate_key" ON "daily_reports"("userId", "reportDate");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
