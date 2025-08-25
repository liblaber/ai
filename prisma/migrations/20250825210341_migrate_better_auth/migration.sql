/*
  Warnings:

  - You are about to drop the column `inviterId` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `member` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `member` table. All the data in the column will be lost.
  - You are about to drop the column `activeOrganizationId` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `user` table. All the data in the column will be lost.
  - Added the required column `inviter_id` to the `invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `invitation` table without a default value. This is not possible if the table is not empty.
  - Made the column `role` on table `invitation` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `organization_id` to the `member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `member` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."member" DROP CONSTRAINT "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."member" DROP CONSTRAINT "member_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_organizationId_fkey";

-- AlterTable
ALTER TABLE "public"."invitation" DROP COLUMN "inviterId",
DROP COLUMN "organizationId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inviter_id" TEXT NOT NULL,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "team_id" TEXT,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."member" DROP COLUMN "organizationId",
DROP COLUMN "userId",
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."session" DROP COLUMN "activeOrganizationId",
ADD COLUMN     "active_organization_id" TEXT,
ADD COLUMN     "active_team_id" TEXT;

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "organizationId";

-- CreateIndex
CREATE INDEX "idx_invitation_inviter_id" ON "public"."invitation"("inviter_id");

-- CreateIndex
CREATE INDEX "idx_invitation_organization_id" ON "public"."invitation"("organization_id");

-- CreateIndex
CREATE INDEX "idx_member_user_id" ON "public"."member"("user_id");

-- CreateIndex
CREATE INDEX "idx_member_organization_id" ON "public"."member"("organization_id");

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
