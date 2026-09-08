-- CreateTable
CREATE TABLE "trusted_peers" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,

    CONSTRAINT "trusted_peers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trusted_peers_ownerId_idx" ON "trusted_peers"("ownerId");

-- CreateIndex
CREATE INDEX "trusted_peers_peerId_idx" ON "trusted_peers"("peerId");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_peers_ownerId_peerId_key" ON "trusted_peers"("ownerId", "peerId");

-- AddForeignKey
ALTER TABLE "trusted_peers" ADD CONSTRAINT "trusted_peers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_peers" ADD CONSTRAINT "trusted_peers_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
