-- CreateTable
CREATE TABLE "usage_sessions" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_sessions_pkey" PRIMARY KEY ("id")
);
