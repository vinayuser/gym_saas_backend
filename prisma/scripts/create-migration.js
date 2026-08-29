#!/usr/bin/env node
/**
 * Creates a new Prisma migration from schema changes.
 *
 * Usage:
 *   npm run migrate:create -- add_phone_to_members
 *   npm run migrate:create add_phone_to_members
 *
 * Workflow:
 *   1. Edit model(s) in prisma/schema/*.prisma
 *   2. Run this script with a descriptive snake_case name
 *   3. Review generated SQL in prisma/migrations/<timestamp>_<name>/
 *   4. Migration is applied automatically in dev via `prisma migrate dev`
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2).filter((a) => a !== '--');
const name = args[0];

if (!name) {
  console.error('\n❌ Migration name is required.\n');
  console.error('Usage: npm run migrate:create -- <migration_name>\n');
  console.error('Examples:');
  console.error('  npm run migrate:create -- add_settings_to_tenants');
  console.error('  npm run migrate:create -- create_loyalty_points_table');
  console.error('  npm run migrate:create -- drop_legacy_column_from_gyms\n');
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*$/.test(name)) {
  console.error('\n❌ Migration name must be snake_case (lowercase, numbers, underscores).\n');
  process.exit(1);
}

console.log(`\n📦 Creating migration: ${name}`);
console.log('   (Edit prisma/schema/*.prisma first, then confirm the generated SQL)\n');

const result = spawnSync('npx', ['prisma', 'migrate', 'dev', '--name', name], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
