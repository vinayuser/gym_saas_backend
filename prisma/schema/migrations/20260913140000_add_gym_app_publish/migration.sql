-- AlterTable
ALTER TABLE "gyms" ADD COLUMN "appAlias" TEXT;
ALTER TABLE "gyms" ADD COLUMN "appPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gyms" ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "gyms_appAlias_key" ON "gyms"("appAlias");
