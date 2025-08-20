/*
  Warnings:

  - Added the required column `type` to the `data_source` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DataSourceType" AS ENUM ('MYSQL', 'POSTGRES', 'SQLITE', 'MONGODB', 'HUBSPOT');

-- AlterTable: Add nullable type column first
ALTER TABLE "public"."data_source" ADD COLUMN "type" "public"."DataSourceType";

-- Backfill the type column based on connection string patterns
UPDATE "public"."data_source" 
SET "type" = CASE 
  WHEN "connectionString" ILIKE '%postgres%' OR "connectionString" ILIKE '%postgresql%' THEN 'POSTGRES'
  WHEN "connectionString" ILIKE '%mysql%' THEN 'MYSQL'
  WHEN "connectionString" ILIKE '%mongodb%' THEN 'MONGODB'
  WHEN "connectionString" ILIKE '%hubspot%' THEN 'HUBSPOT'
  ELSE 'SQLITE'
END;

-- Make the type column NOT NULL with default value
ALTER TABLE "public"."data_source" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "public"."data_source" ALTER COLUMN "type" SET DEFAULT 'SQLITE';
