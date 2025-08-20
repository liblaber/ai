-- CreateEnum
CREATE TYPE "public"."RoleScope" AS ENUM ('GENERAL', 'ENVIRONMENT', 'DATA_SOURCE', 'WEBSITE');

-- AlterTable
ALTER TABLE "public"."role" ADD COLUMN     "resource_id" TEXT,
ADD COLUMN     "scope" "public"."RoleScope" NOT NULL DEFAULT 'GENERAL';
