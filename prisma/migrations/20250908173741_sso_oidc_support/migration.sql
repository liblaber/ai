-- CreateTable
CREATE TABLE "public"."sso_provider" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "friendlyName" TEXT,
    "issuer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "oidcConfig" TEXT,
    "samlConfig" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "sso_provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_provider_providerId_key" ON "public"."sso_provider"("providerId");

-- AddForeignKey
ALTER TABLE "public"."sso_provider" ADD CONSTRAINT "sso_provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
