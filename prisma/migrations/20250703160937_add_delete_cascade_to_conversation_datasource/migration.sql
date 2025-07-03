-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "starter_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "conversation_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_source" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_conversation" ("created_at", "dataSourceId", "description", "id", "starter_id", "updated_at", "userId") SELECT "created_at", "dataSourceId", "description", "id", "starter_id", "updated_at", "userId" FROM "conversation";
DROP TABLE "conversation";
ALTER TABLE "new_conversation" RENAME TO "conversation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
