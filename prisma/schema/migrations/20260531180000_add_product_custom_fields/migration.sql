-- Migration: add product custom fields for dynamic app display

ALTER TABLE "products" ADD COLUMN "customFields" JSONB;
