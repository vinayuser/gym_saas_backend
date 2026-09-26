ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'gym';
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'gym';

CREATE INDEX IF NOT EXISTS "roles_scope_idx" ON "roles"("scope");
CREATE INDEX IF NOT EXISTS "permissions_scope_idx" ON "permissions"("scope");
