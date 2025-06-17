-- CreateTable
CREATE TABLE "snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    CONSTRAINT "snapshot_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "snapshot_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_messageId_key" ON "snapshot"("messageId");
