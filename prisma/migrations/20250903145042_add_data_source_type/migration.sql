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
SET "type" = CAST(CASE
                    WHEN ev.value ILIKE '%postgres%' THEN 'POSTGRES'
                    WHEN ev.value ILIKE '%mysql%' THEN 'MYSQL'
                    WHEN ev.value ILIKE '%mongodb%' THEN 'MONGODB'
                    WHEN ev.value ILIKE '%hubspot%' THEN 'HUBSPOT'
                    ELSE 'SQLITE'
  END AS "public"."DataSourceType")
  FROM "public"."data_source" ds
         JOIN "public"."data_source_property" dsp ON ds.id = dsp.data_source_id AND dsp.type = 'CONNECTION_URL'
  JOIN "public"."environment_variable" ev ON ev.id = dsp.environment_variable_id
WHERE "public"."data_source".id = ds.id;

UPDATE "public"."data_source"
SET "type" = 'SQLITE'::"public"."DataSourceType"
WHERE "type" IS NULL;

-- Make the type column NOT NULL with default value
ALTER TABLE "public"."data_source" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "public"."data_source" ALTER COLUMN "type" SET DEFAULT 'SQLITE';
