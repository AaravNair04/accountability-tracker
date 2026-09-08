/*
  Warnings:

  - You are about to drop the column `token` on the `devices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `devices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "devices_token_key";

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "token",
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "devices_tokenHash_key" ON "devices"("tokenHash");
