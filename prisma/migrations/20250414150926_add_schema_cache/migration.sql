-- CreateTable
CREATE TABLE "schema_cache" (
    "id" TEXT NOT NULL,
    "connection_hash" TEXT NOT NULL,
    "schema_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schema_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schema_cache_connection_hash_key" ON "schema_cache"("connection_hash");
