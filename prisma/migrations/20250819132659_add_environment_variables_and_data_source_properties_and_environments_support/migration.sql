/*
  Warnings:

  - You are about to drop the column `dataSourceId` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `connection_string` on the `data_source` table. All the data in the column will be lost.
  - Added the required column `data_source_id` to the `conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `environment_id` to the `conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `environment_data_source` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DataSourcePropertyType" AS ENUM ('CONNECTION_URL', 'ACCESS_TOKEN', 'REFRESH_TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'API_KEY');

-- CreateEnum
CREATE TYPE "public"."EnvironmentVariableType" AS ENUM ('GLOBAL', 'DATA_SOURCE');

-- AlterEnum
ALTER TYPE "public"."PermissionResource" ADD VALUE 'EnvironmentVariable';

-- DropForeignKey
ALTER TABLE "public"."conversation" DROP CONSTRAINT "conversation_dataSourceId_fkey";

-- AlterTable
ALTER TABLE "public"."conversation" DROP COLUMN "dataSourceId",
ADD COLUMN     "data_source_id" TEXT NOT NULL,
ADD COLUMN     "environment_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."data_source" DROP COLUMN "connection_string";

-- AlterTable
ALTER TABLE "public"."environment_data_source" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."data_source_property" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "environment_variable_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,

    CONSTRAINT "data_source_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."environment_variable" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."EnvironmentVariableType" NOT NULL,
    "environment_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_variable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environment_variable_key_environment_id_key" ON "public"."environment_variable"("key", "environment_id");

-- AddForeignKey
ALTER TABLE "public"."data_source_property" ADD CONSTRAINT "data_source_property_environment_variable_id_fkey" FOREIGN KEY ("environment_variable_id") REFERENCES "public"."environment_variable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_source_property" ADD CONSTRAINT "data_source_property_environment_id_data_source_id_fkey" FOREIGN KEY ("environment_id", "data_source_id") REFERENCES "public"."environment_data_source"("environment_id", "data_source_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environment_variable" ADD CONSTRAINT "environment_variable_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environment_variable" ADD CONSTRAINT "environment_variable_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation" ADD CONSTRAINT "conversation_environment_id_data_source_id_fkey" FOREIGN KEY ("environment_id", "data_source_id") REFERENCES "public"."environment_data_source"("environment_id", "data_source_id") ON DELETE RESTRICT ON UPDATE CASCADE;
