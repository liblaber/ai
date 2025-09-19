/*
  Warnings:

  - You are about to drop the column `name` on the `deployment_method` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."deployment_method_environment_id_name_key";

-- AlterTable
ALTER TABLE "public"."deployment_method" DROP COLUMN "name";
