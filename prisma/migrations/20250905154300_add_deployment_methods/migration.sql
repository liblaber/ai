-- CreateEnum
CREATE TYPE "public"."DeploymentProvider" AS ENUM ('VERCEL', 'NETLIFY', 'AWS');

-- CreateEnum
CREATE TYPE "public"."DeploymentMethodCredentialsType" AS ENUM ('API_KEY', 'ACCESS_KEY', 'SECRET_KEY', 'REGION');

-- CreateTable
CREATE TABLE "public"."deployment_method" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployment_method_credentials" (
    "id" TEXT NOT NULL,
    "deployment_method_id" TEXT NOT NULL,
    "type" "public"."DeploymentMethodCredentialsType" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_method_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deployment_method_name_key" ON "public"."deployment_method"("name");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_method_credentials_deployment_method_id_type_key" ON "public"."deployment_method_credentials"("deployment_method_id", "type");

-- AddForeignKey
ALTER TABLE "public"."deployment_method" ADD CONSTRAINT "deployment_method_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_method_credentials" ADD CONSTRAINT "deployment_method_credentials_deployment_method_id_fkey" FOREIGN KEY ("deployment_method_id") REFERENCES "public"."deployment_method"("id") ON DELETE CASCADE ON UPDATE CASCADE;
