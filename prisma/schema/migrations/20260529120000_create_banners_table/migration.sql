-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'ARCHIVED');
CREATE TYPE "BannerCategory" AS ENUM ('PROMOTION', 'NEW_CLASS', 'MAINTENANCE', 'APP_EXCLUSIVE');
CREATE TYPE "BannerPlacement" AS ENUM ('GLOBAL_HOMEPAGE', 'CLASSES_SECTION', 'DASHBOARD_TOP', 'MEMBER_STORE');
CREATE TYPE "BannerCtaType" AS ENUM ('CLASS_BOOKING', 'STORE_PRODUCT', 'EVENT', 'EXTERNAL_URL');

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT,
    "category" "BannerCategory" NOT NULL DEFAULT 'PROMOTION',
    "placement" "BannerPlacement" NOT NULL DEFAULT 'GLOBAL_HOMEPAGE',
    "imageUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "BannerStatus" NOT NULL DEFAULT 'DRAFT',
    "timeSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaType" "BannerCtaType",
    "ctaDestination" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_gymId_idx" ON "banners"("gymId");
CREATE INDEX "banners_gymId_status_idx" ON "banners"("gymId", "status");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
