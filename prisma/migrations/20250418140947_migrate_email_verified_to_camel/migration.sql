/*
  Warnings:

  - You are about to drop the column `email_verified` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
-- Migrate values
UPDATE "user" SET "emailVerified" = "email_verified";
ALTER TABLE "user" DROP COLUMN "email_verified";
