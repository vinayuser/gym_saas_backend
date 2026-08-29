-- Migration: add_tenant_owner_foreign_key
-- Links tenants.ownerId -> users.id (requires users table to exist first)

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
