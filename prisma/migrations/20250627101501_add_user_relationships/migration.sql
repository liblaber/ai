-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "conversation_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversation" ("created_at", "dataSourceId", "description", "id", "updated_at") SELECT "created_at", "dataSourceId", "description", "id", "updated_at" FROM "conversation";
DROP TABLE "conversation";
ALTER TABLE "new_conversation" RENAME TO "conversation";
CREATE TABLE "new_data_source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "connection_string" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "data_source_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_data_source" ("connection_string", "created_at", "id", "name", "updated_at") SELECT "connection_string", "created_at", "id", "name", "updated_at" FROM "data_source";
DROP TABLE "data_source";
ALTER TABLE "new_data_source" RENAME TO "data_source";
CREATE TABLE "new_website" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT,
    "site_name" TEXT,
    "site_url" TEXT,
    "chat_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    CONSTRAINT "website_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_website" ("chat_id", "created_at", "id", "is_public", "site_id", "site_name", "site_url", "updated_at") SELECT "chat_id", "created_at", "id", "is_public", "site_id", "site_name", "site_url", "updated_at" FROM "website";
DROP TABLE "website";
ALTER TABLE "new_website" RENAME TO "website";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
