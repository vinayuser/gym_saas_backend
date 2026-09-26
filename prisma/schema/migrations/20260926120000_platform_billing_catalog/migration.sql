-- Admin-managed base plan, extra gym price, and per-gym add-ons

CREATE TABLE "platform_catalog" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "baseName" TEXT NOT NULL DEFAULT 'Base gym',
    "baseDescription" TEXT,
    "basePriceMonthly" DECIMAL(10,2) NOT NULL DEFAULT 1999,
    "baseMaxStaff" INTEGER,
    "baseMaxTrainers" INTEGER,
    "baseMaxMembers" INTEGER,
    "baseMaxPlans" INTEGER,
    "extraGymPriceMonthly" DECIMAL(10,2) NOT NULL DEFAULT 999,
    "extraUseBaseLimits" BOOLEAN NOT NULL DEFAULT true,
    "extraMaxStaff" INTEGER,
    "extraMaxTrainers" INTEGER,
    "extraMaxMembers" INTEGER,
    "extraMaxPlans" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_catalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_addons" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerGymMonthly" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_addons_key_key" ON "platform_addons"("key");

ALTER TABLE "gyms" ADD COLUMN "commercialAddons" JSONB;
ALTER TABLE "gyms" ADD COLUMN "dayPassPrice" DECIMAL(10,2);
