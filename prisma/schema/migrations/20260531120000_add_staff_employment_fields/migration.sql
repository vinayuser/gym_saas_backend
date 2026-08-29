-- Staff employment, compensation, and address proof fields

ALTER TABLE "gym_staff" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "baseSalary" DECIMAL(10, 2);
ALTER TABLE "gym_staff" ADD COLUMN "salaryCurrency" TEXT DEFAULT 'INR';
ALTER TABLE "gym_staff" ADD COLUMN "paymentFrequency" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "address" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "city" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "state" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "pincode" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "addressProofUrl" TEXT;
ALTER TABLE "gym_staff" ADD COLUMN "idProofUrl" TEXT;
