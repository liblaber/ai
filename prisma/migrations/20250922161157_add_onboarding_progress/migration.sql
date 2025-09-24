-- CreateTable
CREATE TABLE "public"."onboarding_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "currentStep" TEXT NOT NULL,
    "authMethod" TEXT,
    "adminData" JSONB,
    "ssoConfig" JSONB,
    "llmConfig" JSONB,
    "datasourceConfig" JSONB,
    "usersConfig" JSONB,
    "telemetryConsent" BOOLEAN DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_userId_key" ON "public"."onboarding_progress"("userId");
