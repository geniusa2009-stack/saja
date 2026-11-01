/**
 * Data lifecycle: account deletion (database + private files), queued file
 * removal with retries, and retention of short-lived operational data.
 *
 * File deletion uses an outbox: storage keys are written to
 * `pending_file_deletions` in the SAME transaction that removes the rows, so a
 * crash or a storage error can never leave an orphaned private file behind —
 * the scheduler keeps retrying until the file is gone.
 */
import type { Services } from '../context.ts';
import type { Queryable } from '../db/index.ts';
import { log } from '../lib/log.ts';

export async function queueFileDeletion(q: Queryable, keys: string[], reason: string) {
  for (const k of keys) await q.query('insert into pending_file_deletions (storage_key, reason) values ($1,$2) on conflict (storage_key) do nothing', [k, reason]);
}

/** Tries to remove queued files now. Failures stay queued with backoff. */
export async function runFileDeletions(s: Services, limit = 200): Promise<{ removed: number; failed: number }> {
  const due = await s.db.query<{ storage_key: string; attempts: number }>('select storage_key, attempts from pending_file_deletions where next_attempt_at <= now() order by created_at limit $1', [limit]);
  let removed = 0;
  let failed = 0;
  for (const d of due) {
    try {
      await s.storage.remove(d.storage_key);
      await s.db.query('delete from pending_file_deletions where storage_key = $1', [d.storage_key]);
      removed++;
    } catch (e) {
      failed++;
      const backoffMin = Math.min(24 * 60, 2 ** Math.min(d.attempts, 10));
      await s.db.query("update pending_file_deletions set attempts = attempts + 1, last_error = $2, next_attempt_at = now() + ($3 || ' minutes')::interval where storage_key = $1", [
        d.storage_key,
        e instanceof Error ? e.message.slice(0, 200) : 'error',
        String(backoffMin),
      ]);
      log.error('storage.delete_failed', { attempts: d.attempts + 1, error: e });
    }
  }
  return { removed, failed };
}

/**
 * Permanently deletes an account: every personal row (cascade), private uploads
 * (via the deletion queue), and the guardian relationships that depended on it.
 */
export async function deleteAccount(s: Services, userId: string) {
  await s.db.tx(async (q) => {
    const keys = (await q.query<{ storage_key: string }>('select storage_key from uploads where owner_id = $1', [userId])).map((r) => r.storage_key);
    await queueFileDeletion(q, keys, 'account-deleted');
    // Children who relied on this guardian lose that consent — and with it, circle access — until another guardian links.
    const kids = await q.query<{ child_user_id: string }>("select child_user_id from guardian_links where guardian_user_id = $1 and status = 'active'", [userId]);
    for (const k of kids) {
      await q.query("update age_status set guardian_consent = 'revoked' where user_id = $1", [k.child_user_id]);
      await q.query('update circle_members set left_at = now() where user_id = $1 and left_at is null', [k.child_user_id]);
    }
    await q.query('delete from users where id = $1', [userId]);
  });
  const r = await runFileDeletions(s);
  log.info('account.deleted', { filesRemoved: r.removed, filesQueued: r.failed });
}

/** Short-lived operational data is not kept longer than it is useful. Documented in docs/PRIVACY.md. */
export const RETENTION = {
  expiredSessionsDays: 0,
  passwordResetsDays: 1,
  emailOutboxDays: 1, // dev outbox rows contain reset links: kept no longer than a day
  analyticsDays: 180,
  readNotificationsDays: 90,
  dailyUsageDays: 60,
  deletedUploadsDays: 0,
  abandonedGuestsDays: 90,
} as const;

export async function runRetention(s: Services) {
  const R = RETENTION;
  const n = async (sql: string, params: unknown[] = []) => (await s.db.query<{ n: number }>(`with d as (${sql} returning 1) select count(*)::int as n from d`, params))[0].n;
  const out = {
    sessions: await n('delete from sessions where expires_at < now()'),
    resets: await n(`delete from password_resets where (used_at is not null or expires_at < now()) and created_at < now() - interval '${R.passwordResetsDays} days'`),
    outbox: await n(`delete from email_outbox where created_at < now() - interval '${R.emailOutboxDays} days'`),
    analytics: await n(`delete from analytics_events where created_at < now() - interval '${R.analyticsDays} days'`),
    notifications: await n(`delete from notifications where status in ('read','cancelled','failed') and created_at < now() - interval '${R.readNotificationsDays} days'`),
    usage: await n(`delete from daily_usage where usage_date < current_date - ${R.dailyUsageDays}`),
    // Guests who never came back and never made an account: their journey is deleted, files included.
    guests: 0,
  };
  const stale = await s.db.query<{ id: string }>(
    `select u.id from users u where u.is_guest and not u.is_demo and u.created_at < now() - interval '${R.abandonedGuestsDays} days'
       and not exists (select 1 from sessions x where x.user_id = u.id and x.last_seen_at > now() - interval '${R.abandonedGuestsDays} days') limit 500`,
  );
  for (const u of stale) await deleteAccount(s, u.id);
  out.guests = stale.length;
  // Soft-deleted upload rows: the file is queued, the row is no longer needed.
  const gone = await s.db.query<{ storage_key: string }>('delete from uploads where deleted_at is not null returning storage_key');
  await queueFileDeletion(s.db, gone.map((g) => g.storage_key), 'upload-deleted');
  await runFileDeletions(s);
  log.info('retention.ran', out);
  return out;
}
