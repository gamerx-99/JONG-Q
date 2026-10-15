// Simulates exactly what Supabase's "Choose GitHub repository" provisioning does:
// apply the migration history to a BRAND-NEW empty database, then confirm the
// schema matches prisma/schema.prisma. Uses a throwaway database that is dropped
// afterwards, so the dev database is never touched.
// Run: npx tsx scripts/check-migration-from-empty.ts
import assert from 'node:assert';

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const admin = new PrismaClient(); // connects to the normal dev DB, only to CREATE/DROP DATABASE

  const TEST_DB = 'jongq_migration_test';
  const url = process.env.DATABASE_URL;
  assert.ok(url, 'DATABASE_URL must be set');
  const base = new URL(url);
  const testUrl = (() => {
    const u = new URL(url);
    u.pathname = `/${TEST_DB}`;
    return u.toString();
  })();

  const { execSync } = await import('node:child_process');
  const env = { ...process.env, DATABASE_URL: testUrl };

  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB}"`);
    console.log(`created empty database ${TEST_DB}`);

    // This is the command Supabase runs.
    execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });

    const fresh = new PrismaClient({ datasources: { db: { url: testUrl } } });

    const tables = await fresh.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = tables.map((t) => t.table_name);
    console.log('\ntables created:', names.join(', '));
    for (const t of ['User', 'Shop', 'QueueCategory', 'TimeSlot', 'Ticket', 'AdminLog']) {
      assert.ok(names.includes(t), `missing table ${t}`);
    }

    // The columns added during M4 must be present — they are the ones a stale
    // migration would silently miss.
    for (const [table, column] of [
      ['QueueCategory', 'people'],
      ['TimeSlot', 'enabled'],
      ['Shop', 'province'],
    ] as const) {
      const cols = await fresh.$queryRawUnsafe<{ column_name: string }[]>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
        table,
      );
      assert.ok(cols.some((c) => c.column_name === column), `${table}.${column} missing`);
      console.log(`  ok ${table}.${column}`);
    }

    // Drifted schema? --exit-code returns 1 on any difference (and prints a banner to
    // stdout either way, so the exit status is what matters, not the output).
    try {
      execSync(
        'npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code',
        { env, stdio: 'pipe' },
      );
    } catch {
      throw new Error('schema drift: the migrated database does not match prisma/schema.prisma');
    }
    console.log('no drift between the migrated database and schema.prisma');

    await fresh.$disconnect();
  } finally {
    // migrate deploy leaves a backend attached; terminate it before dropping.
    await admin.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()`,
    );
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
    const left = await admin.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM pg_database WHERE datname = '${TEST_DB}'`,
    );
    console.log(`dropped ${TEST_DB} (remaining: ${left[0].n})`);
    await admin.$disconnect();
    void base;
  }
  console.log('\nBaseline migration applies cleanly to an empty database.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
