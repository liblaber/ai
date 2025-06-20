-- RedefineTables

CREATE TABLE "new_conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    CONSTRAINT "conversation_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
DROP TABLE "conversation";
ALTER TABLE "new_conversation" RENAME TO "conversation";
