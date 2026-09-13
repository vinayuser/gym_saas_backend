-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenants_email_idx" ON "tenants"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenants_isActive_idx" ON "tenants"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenants_createdAt_idx" ON "tenants"("createdAt");
