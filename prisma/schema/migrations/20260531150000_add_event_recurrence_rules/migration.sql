-- Migration: add recurrence rule fields for weekly/monthly events

ALTER TABLE "events" ADD COLUMN "recurrenceWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "events" ADD COLUMN "recurrenceWeekOfMonth" INTEGER;
ALTER TABLE "events" ADD COLUMN "recurrenceDayOfWeek" INTEGER;
