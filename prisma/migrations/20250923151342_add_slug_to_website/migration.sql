/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `website` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."website" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "website_slug_key" ON "public"."website"("slug");
