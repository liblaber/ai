-- AlterTable
ALTER TABLE "website" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "website_slug_key" ON "website"("slug");
