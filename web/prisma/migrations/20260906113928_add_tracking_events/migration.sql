-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_events_deviceId_idx" ON "tracking_events"("deviceId");

-- CreateIndex
CREATE INDEX "tracking_events_createdAt_idx" ON "tracking_events"("createdAt");

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
