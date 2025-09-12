/*
  Warnings:

  - You are about to drop the column `organization_id` on the `environment` table. All the data in the column will be lost.
  - You are about to drop the column `organization_id` on the `role` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `organization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `environment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."environment" DROP CONSTRAINT "environment_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."role" DROP CONSTRAINT "role_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."environment_name_organization_id_key";

-- DropIndex
DROP INDEX "public"."idx_environment_organization_id";

-- DropIndex
DROP INDEX "public"."role_organization_id_name_key";

-- AlterTable
ALTER TABLE "public"."environment" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "public"."role" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "organizationId";

-- DropTable
DROP TABLE "public"."organization";

-- CreateIndex
CREATE UNIQUE INDEX "environment_name_key" ON "public"."environment"("name");
