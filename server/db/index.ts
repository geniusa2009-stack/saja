/**
 * Database access. One small interface, two adapters:
 *  - PGlite (real PostgreSQL in WASM, with pgvector) for local development and tests
 *  - node-postgres for managed Postgres (Supabase, Neon, RDS…) via DATABASE_URL
 * The same SQL migrations run on both.
 */
import type { Config } from '../config.ts';

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  kind: Config['modes']['database'];
}

export async function createDb(config: Config): Promise<Db> {
  if (config.modes.database === 'postgres') return createPg(config.DATABASE_URL!);
  return createPglite(config.modes.database === 'pglite-memory' ? undefined : config.PGLITE_DIR, config.modes.database);
}

async function createPglite(dir: string | undefined, kind: Db['kind']): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { vector } = await import('@electric-sql/pglite-pgvector');
  let release = () => {};
  if (dir) {
    const fs = await import('node:fs');
    fs.mkdirSync(dir, { recursive: true });
    // An on-disk PGlite database must only ever be opened by ONE process (server or CLI), or it can corrupt.
    const lock = `${dir.replace(/\/$/, '')}.lock`;
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
    } catch {
      const holder = Number(fs.readFileSync(lock, 'utf8'));
      let alive: boolean;
      try {
        process.kill(holder, 0);
        alive = holder !== process.pid;
      } catch {
        alive = false; // no such process: the lock is stale
      }
      if (alive) throw new Error(`The embedded database at ${dir} is in use by process ${holder}. Stop the SAJA server first (or use DATABASE_URL with Postgres).`);
      fs.writeFileSync(lock, String(process.pid)); // stale lock from a crashed process
    }
    release = () => {
      try {
        if (fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock);
      } catch {
        /* already gone */
      }
    };
    process.once('exit', release);
    for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => (release(), process.exit(0)));
  }
  const pg = await PGlite.create({ dataDir: dir, extensions: { vector } });
  // PGlite is single-connection: serialise transactions so concurrent requests never interleave.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => undefined);
    return run;
  };
  const q: Queryable = { query: async (sql, params) => (await pg.query(sql, params as unknown[])).rows as never };
  return {
    kind,
    query: (sql, params) => serial(() => q.query(sql, params)),
    exec: (sql) => serial(async () => void (await pg.exec(sql))),
    tx: (fn) => serial(() => pg.transaction(async (t) => fn({ query: async (sql, params) => (await t.query(sql, params as unknown[])).rows as never }))),
    close: async () => {
      await pg.close();
      release();
    },
  };
}

async function createPg(url: string): Promise<Db> {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return {
    kind: 'postgres',
    query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
    exec: async (sql) => void (await pool.query(sql)),
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn({ query: async (sql, params) => (await client.query(sql, params as unknown[])).rows });
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export async function one<T>(q: Queryable, sql: string, params?: unknown[]): Promise<T | undefined> {
  return (await q.query<T>(sql, params))[0];
}
