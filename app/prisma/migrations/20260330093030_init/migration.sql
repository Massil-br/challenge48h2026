-- CreateTable
CREATE TABLE "raw_data" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformed_data" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "total_residents" INTEGER NOT NULL,
    "interested_users" INTEGER NOT NULL,
    "available_spots" INTEGER NOT NULL,
    "demand_supply_ratio" DOUBLE PRECISION NOT NULL,
    "avg_monthly_revenue" DOUBLE PRECISION NOT NULL,
    "ranking" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transformed_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_data_hash_key" ON "raw_data"("hash");
