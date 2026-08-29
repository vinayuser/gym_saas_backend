-- Migration: expand enquiry fields for gym member inquiry management

ALTER TABLE "enquiries" ADD COLUMN "lastName" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "gender" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "enquiries" ADD COLUMN "address" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "city" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "state" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "pincode" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "occupation" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "referralSource" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "interestedIn" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "fitnessGoal" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "preferredContact" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "budget" DECIMAL(10, 2);
ALTER TABLE "enquiries" ADD COLUMN "trialDate" TIMESTAMP(3);
