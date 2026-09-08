-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usage_sessions" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE INDEX "usage_sessions_deviceId_idx" ON "usage_sessions"("deviceId");

-- AddForeignKey
ALTER TABLE "usage_sessions" ADD CONSTRAINT "usage_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
