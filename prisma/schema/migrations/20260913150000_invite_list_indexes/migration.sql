-- CreateIndex
CREATE INDEX IF NOT EXISTS "gym_invites_createdAt_idx" ON "gym_invites"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gym_invites_status_createdAt_idx" ON "gym_invites"("status", "createdAt");
