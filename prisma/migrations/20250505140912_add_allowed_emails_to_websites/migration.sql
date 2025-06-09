-- AlterTable
ALTER TABLE "website" ADD COLUMN     "allowed_user_emails" TEXT[] DEFAULT ARRAY[]::TEXT[];
