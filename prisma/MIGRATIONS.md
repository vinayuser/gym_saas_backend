# Database Migrations Guide

This project uses **Prisma Migrate** — every database change is applied through versioned SQL migration files. Do **not** use `prisma db push` in this project.

## Folder structure

```
prisma/
├── schema/                         # Prisma models (one file per domain/table group)
│   ├── schema.prisma               # generator + datasource
│   ├── enums.prisma
│   ├── tenant.prisma               # Tenant, Subscription, ...
│   ├── user.prisma                 # User, RefreshToken, ...
│   ├── gym.prisma
│   ├── member.prisma
│   ├── migrations/                 # Ordered SQL migrations (required location for multi-file schema)
│   │   ├── 20260529060000_create_enums/
│   │   │   └── migration.sql
│   │   └── ...
│   └── ...
├── scripts/
│   └── create-migration.js
├── MIGRATIONS.md
└── seed.js
prisma.config.ts                    # Prisma 6 config (schema + migrations paths)
```

## Initial setup (new machine / fresh DB)

```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL

npm run migrate:deploy    # apply all migrations
npm run prisma:generate   # regenerate Prisma Client
npm run db:seed           # seed roles, plans, demo data
```

Or one command:

```bash
npm run db:setup
```

## Daily workflow — add / change / remove

### 1. Add a new table

1. Create or edit a model file, e.g. `prisma/schema/loyalty.prisma`:

```prisma
model LoyaltyPoint {
  id       String @id @default(uuid())
  memberId String
  points   Int    @default(0)
  member   Member @relation(fields: [memberId], references: [id])
  @@map("loyalty_points")
}
```

2. Add the reverse relation on `Member` in `member.prisma` if needed.

3. Create and run migration:

```bash
npm run migrate:create -- create_loyalty_points_table
```

4. Prisma generates `prisma/migrations/<timestamp>_create_loyalty_points_table/migration.sql` and applies it.

### 2. Add or modify a column

1. Edit the model in `prisma/schema/*.prisma`, e.g. add `settings Json?` to `Tenant`.

2. Run:

```bash
npm run migrate:create -- add_settings_to_tenants
```

3. Review the generated SQL (ALTER TABLE ...) before committing.

### 3. Remove a column

1. Remove the field from the Prisma model.

2. Run:

```bash
npm run migrate:create -- remove_legacy_field_from_gyms
```

### 4. Delete a table

1. Remove the model from `prisma/schema/*.prisma` and all relations pointing to it.

2. Run:

```bash
npm run migrate:create -- drop_old_table_name
```

## Commands reference

| Command | When to use |
|---------|-------------|
| `npm run migrate:create -- <name>` | After editing schema — creates + applies migration (dev) |
| `npm run migrate:dev` | Interactive migrate (same as create without wrapper) |
| `npm run migrate:deploy` | **Production/CI** — apply pending migrations only |
| `npm run migrate:status` | List applied vs pending migrations |
| `npm run migrate:reset` | ⚠️ Drop DB, re-run all migrations + seed (dev only) |
| `npm run prisma:generate` | Regenerate client after schema changes |
| `npm run db:seed` | Run seeders |

## Production deployment

```bash
npm run migrate:deploy
npm run prisma:generate
npm start
```

Never run `migrate:dev` on production.

## Rules

1. **One logical change per migration** — e.g. `add_phone_to_members`, not `misc_updates`.
2. **Never edit** a migration that has already been deployed to production.
3. **Never use** `prisma db push` — it skips migration history.
4. **Always commit** both `prisma/schema/` changes and `prisma/migrations/` together.
5. **Review SQL** in each new `migration.sql` before merging.

## Existing baseline migrations

| Migration | Description |
|-----------|-------------|
| `20260529060000_create_enums` | All enum types |
| `20260529060100_create_tenant_subscription_tables` | tenants, subscription_plans, subscriptions, saas_payments |
| `20260529060200_create_rbac_tables` | roles, permissions, role_permissions |
| `20260529060300_create_users_and_auth_tables` | users, refresh_tokens, password_resets, otp_verifications |
| `20260529060400_add_tenant_owner_foreign_key` | tenants.ownerId → users |
| `20260529060500_create_gym_tables` | gyms, gym_branches, gym_staff, trainers |
| `20260529060600_create_user_role_assignments_table` | user_role_assignments |
| `20260529060700_create_member_tables` | members, body_measurements |
| `20260529060800_create_membership_tables` | plans, memberships, payments, invoices, coupons, offers |
| `20260529060900_create_attendance_table` | attendance |
| `20260529061000_create_event_tables` | events, event_bookings |
| `20260529061100_create_enquiry_table` | enquiries |
| `20260529061200_create_inventory_tables` | product_categories, products, sales, sale_items |
| `20260529061300_create_workout_diet_tables` | workout_plans, diet_plans |
| `20260529061400_create_notification_audit_tables` | notifications, audit_logs |
