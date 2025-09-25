-- AlterEnum
ALTER TYPE "public"."PermissionResource" ADD VALUE 'Conversation';

-- AlterEnum
ALTER TYPE "public"."RoleScope" ADD VALUE 'CONVERSATION';

-- AlterTable
ALTER TABLE "public"."permission" ADD COLUMN     "conversation_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_permission_conversation_id" ON "public"."permission"("conversation_id");

-- AddForeignKey
ALTER TABLE "public"."permission" ADD CONSTRAINT "permission_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
