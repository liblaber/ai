/*
  Warnings:

  - A unique constraint covering the columns `[environment_id,name]` on the table `deployment_method` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."deployment_method_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "deployment_method_environment_id_name_key" ON "public"."deployment_method"("environment_id", "name");
