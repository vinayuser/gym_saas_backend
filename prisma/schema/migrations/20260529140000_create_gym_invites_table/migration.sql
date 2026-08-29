-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'SENT', 'PAYMENT_PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "gym_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviteeName" TEXT,
    "businessName" TEXT,
    "note" TEXT,
    "token" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "tenantId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "onboardingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gym_invites_token_key" ON "gym_invites"("token");

-- CreateIndex
CREATE INDEX "gym_invites_email_idx" ON "gym_invites"("email");

-- CreateIndex
CREATE INDEX "gym_invites_status_idx" ON "gym_invites"("status");

-- AddForeignKey
ALTER TABLE "gym_invites" ADD CONSTRAINT "gym_invites_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_invites" ADD CONSTRAINT "gym_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_invites" ADD CONSTRAINT "gym_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
