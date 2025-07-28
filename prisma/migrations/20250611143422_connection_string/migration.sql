DELETE FROM "data_source";
DELETE FROM "schema_cache";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_data_source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "connection_string" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
DROP TABLE "data_source";
ALTER TABLE "new_data_source" RENAME TO "data_source";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
