-- Migration: store order fulfillment for member pickup

CREATE TYPE "StoreOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED');
CREATE TYPE "StoreFulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

ALTER TABLE "sales"
  ADD COLUMN "memberId" TEXT,
  ADD COLUMN "orderNumber" TEXT,
  ADD COLUMN "fulfillmentStatus" "StoreOrderStatus" NOT NULL DEFAULT 'PLACED',
  ADD COLUMN "fulfillmentType" "StoreFulfillmentType" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "collectedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "sales_gymId_soldAt_idx" ON "sales"("gymId", "soldAt");
CREATE INDEX "sales_memberId_idx" ON "sales"("memberId");
