-- DropForeignKey
ALTER TABLE "public"."data_source_property" DROP CONSTRAINT "data_source_property_environment_id_data_source_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."data_source_property" ADD CONSTRAINT "data_source_property_environment_id_data_source_id_fkey" FOREIGN KEY ("environment_id", "data_source_id") REFERENCES "public"."environment_data_source"("environment_id", "data_source_id") ON DELETE CASCADE ON UPDATE CASCADE;
