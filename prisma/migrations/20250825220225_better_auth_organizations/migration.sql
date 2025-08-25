/*
  Warnings:

  - You are about to drop the column `organizationId` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_organizationId_fkey";

-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "public"."session" ADD COLUMN     "active_organization_id" TEXT,
ADD COLUMN     "active_team_id" TEXT;

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "organizationId";

-- CreateTable
CREATE TABLE "public"."member" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "team_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_member_user_id" ON "public"."member"("user_id");

-- CreateIndex
CREATE INDEX "idx_member_organization_id" ON "public"."member"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_user_id_organization_id_key" ON "public"."member"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "idx_invitation_inviter_id" ON "public"."invitation"("inviter_id");

-- CreateIndex
CREATE INDEX "idx_invitation_organization_id" ON "public"."invitation"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "public"."organization"("slug");

-- CreateIndex
CREATE INDEX "idx_session_active_organization_id" ON "public"."session"("active_organization_id");

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member" ADD CONSTRAINT "member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation" ADD CONSTRAINT "invitation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
