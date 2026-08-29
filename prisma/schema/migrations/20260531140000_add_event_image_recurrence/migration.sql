-- Migration: add event image and recurrence for calendar events

CREATE TYPE "EventRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "events" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "recurrence" "EventRecurrence" NOT NULL DEFAULT 'NONE';
ALTER TABLE "events" ADD COLUMN "recurrenceEndAt" TIMESTAMP(3);
