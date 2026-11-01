/**
 * Operator CLI. Roles and verification are never granted from the web client —
 * the first admin is created here, on the server, by someone with shell access.
 *
 *   npm run saja -- grant-role <email> <admin|moderator|mentor|scholar|guardian>
 *   npm run saja -- revoke-role <email> <role>
 *   npm run saja -- roles <email>
 *   npm run saja -- vapid                 # generate Web Push keys for .env
 *   npm run saja -- migrate               # apply migrations + seed demo content
 *   npm run saja -- outbox                # show dev-outbox emails (no SMTP configured)
 *   npm run saja -- doctor                # live-check every configured AI provider and external service (PASS / FAIL / NOT CONFIGURED / NOT TESTED)
 */
import webpush from 'web-push';
import { loadConfig } from './config.ts';
import { createDb, one } from './db/index.ts';
import { migrate } from './db/migrate.ts';
import { createServices } from './services.ts';
import { formatDoctor, runDoctor } from './doctor.ts';

const ROLES = ['learner', 'guardian', 'mentor', 'scholar', 'moderator', 'admin'] as const;
const [cmd, ...args] = process.argv.slice(2);
const out = (x: unknown) => process.stdout.write(`${typeof x === 'string' ? x : JSON.stringify(x, null, 2)}\n`);
const fail = (m: string): never => {
  process.stderr.write(`${m}\n`);
  process.exit(1);
};

async function withDb<T>(fn: (db: Awaited<ReturnType<typeof createDb>>) => Promise<T>) {
  const db = await createDb(loadConfig());
  try {
    await migrate(db);
    return await fn(db);
  } finally {
    await db.close();
  }
}

async function userId(db: Awaited<ReturnType<typeof createDb>>, email?: string) {
  if (!email) fail('Email required.');
  const u = await one<{ id: string }>(db, 'select id from users where lower(email) = lower($1) and deleted_at is null', [email]);
  return u?.id ?? fail(`No account with email ${email}. The person must sign up first.`);
}

function role(r?: string) {
  if (!r || !(ROLES as readonly string[]).includes(r)) fail(`Role must be one of: ${ROLES.join(', ')}`);
  return r!;
}

async function main() {
  switch (cmd) {
  case 'grant-role': {
    const r = role(args[1]);
    await withDb(async (db) => {
      const id = await userId(db, args[0]);
      await db.query('insert into user_roles (user_id, role) values ($1,$2) on conflict do nothing', [id, r]);
      await db.query("insert into moderation_actions (target_type, target_id, action, reason, actor_kind) values ('user', $1, 'allow', $2, 'human')", [id, `role granted via CLI: ${r}`]);
      if (r === 'scholar') out('Note: a scholar role alone is NOT verification. An admin must verify the scholar profile (POST /api/admin/scholars/:id/verification) after checking credentials.');
      out(`Granted ${r} to ${args[0]}.`);
    });
    break;
  }
  case 'revoke-role': {
    const r = role(args[1]);
    await withDb(async (db) => {
      const id = await userId(db, args[0]);
      await db.query('delete from user_roles where user_id = $1 and role = $2', [id, r]);
      await db.query("insert into moderation_actions (target_type, target_id, action, reason, actor_kind) values ('user', $1, 'hide', $2, 'human')", [id, `role revoked via CLI: ${r}`]);
      out(`Revoked ${r} from ${args[0]}.`);
    });
    break;
  }
  case 'roles':
    await withDb(async (db) => out((await db.query<{ role: string }>('select role from user_roles where user_id = $1', [await userId(db, args[0])])).map((x) => x.role)));
    break;
  case 'vapid': {
    const k = webpush.generateVAPIDKeys();
    out(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}`);
    break;
  }
  case 'migrate': {
    const s = await createServices(loadConfig());
    await s.db.close();
    out('Migrations applied; demo content seeded if the database was empty.');
    break;
  }
  case 'outbox':
    await withDb(async (db) => out(await db.query("select to_email, subject, body, created_at from email_outbox order by created_at desc limit 10")));
    break;
  case 'doctor': {
    const config = loadConfig();
    const results = await runDoctor(config);
    out(formatDoctor(results, config));
    if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
    break;
  }
  default:
    out('Commands: grant-role <email> <role> · revoke-role <email> <role> · roles <email> · vapid · migrate · outbox · doctor');
}
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
