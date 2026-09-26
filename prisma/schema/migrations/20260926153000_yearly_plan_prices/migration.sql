-- Yearly prices for the first gym, each extra gym, and every add-on

ALTER TABLE "platform_catalog" ADD COLUMN "basePriceYearly" DECIMAL(10,2) NOT NULL DEFAULT 19990;
ALTER TABLE "platform_catalog" ADD COLUMN "extraGymPriceYearly" DECIMAL(10,2) NOT NULL DEFAULT 9990;

ALTER TABLE "platform_addons" ADD COLUMN "pricePerGymYearly" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "platform_catalog"
SET "basePriceYearly" = "basePriceMonthly" * 10,
    "extraGymPriceYearly" = "extraGymPriceMonthly" * 10;

UPDATE "platform_addons"
SET "pricePerGymYearly" = "pricePerGymMonthly" * 10;
