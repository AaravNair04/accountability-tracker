-- CreateTable
CREATE TABLE "tracked_sites" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,

    CONSTRAINT "tracked_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_sites_userId_idx" ON "tracked_sites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_sites_userId_hostname_key" ON "tracked_sites"("userId", "hostname");

-- AddForeignKey
ALTER TABLE "tracked_sites" ADD CONSTRAINT "tracked_sites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
