import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { config } from './config.js';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of shifting them through local time.
pg.types.setTypeParser(1082, v => v);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
  max: 10
});

export async function q(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function one(text, params) {
  const rows = await q(text, params);
  return rows[0] || null;
}

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn({
      q: async (t, p) => (await client.query(t, p)).rows,
      one: async (t, p) => (await client.query(t, p)).rows[0] || null
    });
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function setting(key) {
  const row = await one('SELECT value FROM settings WHERE key = $1', [key]);
  return row ? row.value : null;
}

export async function logEvent(kind, message, payload = null) {
  await q('INSERT INTO sync_events(kind, message, payload) VALUES ($1, $2, $3)', [kind, message, payload]);
}

/** Apply db/migrations/*.sql in name order, once each. Seed demo data on an empty database if asked. */
export async function migrate({ log = console.log } = {}) {
  await q(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const dir = path.join(config.dbDir, 'migrations');
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();
  const done = new Set((await q('SELECT name FROM schema_migrations')).map(r => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await fs.readFile(path.join(dir, f), 'utf8');
    await tx(async t => {
      await t.q(sql);
      await t.q('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
    });
    log(`migrated ${f}`);
  }
  if (config.seedDemo) {
    const { n } = await one('SELECT count(*)::int AS n FROM people');
    if (n === 0) {
      const sql = await fs.readFile(path.join(config.dbDir, 'seed', 'demo.sql'), 'utf8');
      await tx(t => t.q(sql));
      log('seeded demo data');
    }
  }
}
