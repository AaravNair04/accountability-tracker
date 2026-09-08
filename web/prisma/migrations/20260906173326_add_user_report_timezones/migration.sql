/*
  Warnings:

  - Added the required column `timezone` to the `daily_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "timezone" TEXT NOT NULL,
ALTER COLUMN "reportDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
