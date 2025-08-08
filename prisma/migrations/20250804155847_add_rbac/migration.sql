-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('manage', 'create', 'read', 'update', 'delete');

-- CreateEnum
CREATE TYPE "PermissionResource" AS ENUM ('all', 'Environment', 'DataSource', 'Website', 'BuilderApp', 'AdminApp');

-- AlterEnum
ALTER TYPE "StorageType" ADD VALUE 'DATABASE';

-- AlterEnum
ALTER TYPE "UserRole" RENAME TO "DeprecatedRole";

-- DropForeignKey
ALTER TABLE "data_source" DROP CONSTRAINT "data_source_userId_fkey";

-- DropForeignKey
ALTER TABLE "website" DROP CONSTRAINT "website_userId_fkey";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" TYPE "DeprecatedRole" USING "role"::text::"DeprecatedRole";

-- AlterTable
ALTER TABLE "website" ADD COLUMN "environment_id" TEXT;

-- RenameColumn
ALTER TABLE "data_source" RENAME COLUMN "userId" TO "created_by_id";

-- RenameColumn
ALTER TABLE "website" RENAME COLUMN "userId" TO "created_by_id";

-- CreateTable
CREATE TABLE "environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_data_source" (
    "environment_id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_data_source_pkey" PRIMARY KEY ("environment_id","data_source_id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "environment_id" TEXT,
    "data_source_id" TEXT,
    "website_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_environment_organization_id" ON "environment"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "environment_name_organization_id_key" ON "environment"("name", "organization_id");

-- CreateIndex
CREATE INDEX "idx_environment_data_source_environment_id" ON "environment_data_source"("environment_id");

-- CreateIndex
CREATE INDEX "idx_environment_data_source_data_source_id" ON "environment_data_source"("data_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_organization_id_name_key" ON "role"("organization_id", "name");

-- CreateIndex
CREATE INDEX "idx_user_role_role_id" ON "user_role"("role_id");

-- CreateIndex
CREATE INDEX "idx_user_role_user_id" ON "user_role"("user_id");

-- CreateIndex
CREATE INDEX "idx_permission_role_id" ON "permission"("role_id");

-- CreateIndex
CREATE INDEX "idx_permission_environment_id" ON "permission"("environment_id");

-- CreateIndex
CREATE INDEX "idx_permission_data_source_id" ON "permission"("data_source_id");

-- CreateIndex
CREATE INDEX "idx_permission_website_id" ON "permission"("website_id");

-- AddForeignKey
ALTER TABLE "data_source" ADD CONSTRAINT "data_source_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website" ADD CONSTRAINT "website_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website" ADD CONSTRAINT "website_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment" ADD CONSTRAINT "environment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_data_source" ADD CONSTRAINT "environment_data_source_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_data_source" ADD CONSTRAINT "environment_data_source_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
