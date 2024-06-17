/*
  Warnings:

  - You are about to drop the column `lga` on the `ClientSetup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClientSetup" DROP COLUMN "lga",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "company_name" TEXT;
