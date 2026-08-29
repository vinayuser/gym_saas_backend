-- AlterTable
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "twoFactorConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
