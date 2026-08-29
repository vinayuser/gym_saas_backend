-- Migration: link materialized recurring event spans

ALTER TABLE "events" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "events_seriesId_idx" ON "events"("seriesId");
