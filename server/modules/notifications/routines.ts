/**
 * Optional daily remembrance reminders. These are *not* records of whether the
 * person practiced anything. Skip stale windows after downtime; dedupe by day.
 */
import type { Services } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { log } from '../../lib/log.ts';
import { notify } from './service.ts';

export type RemembranceKind = 'morning' | 'evening';
export interface DevotionalRoutine {
  kind: RemembranceKind;
  enabled: boolean;
  time: string;
  timeZone: string;
}
interface SavedRoutine extends DevotionalRoutine {
  user_id: string;
  last_local_date: string | null;
}
const DEFAULTS: Record<RemembranceKind, string> = { morning: '07:00', evening: '17:00' };

export function localDateAndMinute(at: Date, timeZone: string): { date: string; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function routineIsDue(r: SavedRoutine, now: Date): { due: boolean; date: string } {
  const local = localDateAndMinute(now, r.timeZone);
  const [hour, minute] = r.time.split(':').map(Number);
  const scheduled = hour * 60 + minute;
  // A missed device/server wakeup should not send a notification several hours late.
  const due = r.enabled && r.last_local_date !== local.date
    && local.minute >= scheduled && local.minute < scheduled + 15;
  return { due, date: local.date };
}

const toRoutine = (r: { kind: RemembranceKind; enabled: boolean; at_time: string; time_zone: string }): DevotionalRoutine =>
  ({ kind: r.kind, enabled: r.enabled, time: r.at_time, timeZone: r.time_zone });

export async function getDevotionalRoutines(q: Queryable, userId: string): Promise<DevotionalRoutine[]> {
  const rows = await q.query<{ kind: RemembranceKind; enabled: boolean; at_time: string; time_zone: string }>(
    'select kind, enabled, at_time, time_zone from devotional_reminders where user_id = $1', [userId],
  );
  const found = new Map(rows.map((r) => [r.kind, toRoutine(r)]));
  return (['morning', 'evening'] as RemembranceKind[]).map((kind) =>
    found.get(kind) ?? { kind, enabled: false, time: DEFAULTS[kind], timeZone: 'UTC' });
}

export async function saveDevotionalRoutine(
  q: Queryable, userId: string, kind: RemembranceKind, input: Omit<DevotionalRoutine, 'kind'>,
): Promise<DevotionalRoutine> {
  const [row] = await q.query<{ kind: RemembranceKind; enabled: boolean; at_time: string; time_zone: string }>(
    `insert into devotional_reminders(user_id, kind, enabled, at_time, time_zone)
      values ($1,$2,$3,$4,$5)
      on conflict (user_id,kind) do update set enabled=$3,at_time=$4,time_zone=$5,updated_at=now(),last_local_date=null
      returning kind,enabled,at_time,time_zone`,
    [userId, kind, input.enabled, input.time, input.timeZone],
  );
  return toRoutine(row);
}

const CONTENT: Record<RemembranceKind, { title: { ar: string; en: string }; body: { ar: string; en: string } }> = {
  morning: {
    title: { ar: 'وقت هادئ لأذكار الصباح', en: 'A gentle morning remembrance' },
    body: { ar: 'لو مناسب لك، افتح وردك أو أذكارك على راحتك.', en: 'If it suits your day, take a moment for your remembrance.' },
  },
  evening: {
    title: { ar: 'تذكير اختياري بأذكار المساء', en: 'An optional evening remembrance' },
    body: { ar: 'وقت قصير للذكر أو الدعاء، من غير ضغط.', en: 'A quiet moment for remembrance or supplication, with no pressure.' },
  },
};

/** Single-worker scheduler; SQL dedupe also protects against repeated ticks. */
export async function runDevotionalRoutines(s: Services, limit = 500): Promise<number> {
  const rows = await s.db.query<{
    user_id: string; kind: RemembranceKind; enabled: boolean; at_time: string; time_zone: string; last_local_date: string | null;
  }>('select user_id,kind,enabled,at_time,time_zone,last_local_date from devotional_reminders where enabled = true limit $1', [limit]);
  let due = 0;
  for (const row of rows) {
    try {
      const routine: SavedRoutine = {
        user_id: row.user_id, kind: row.kind, enabled: row.enabled,
        time: row.at_time, timeZone: row.time_zone, last_local_date: row.last_local_date,
      };
      const { due: ready, date } = routineIsDue(routine, s.now());
      if (!ready) continue;
      const content = CONTENT[row.kind];
      await notify(s, row.user_id, {
        category: 'adhkar', ...content, url: '/day#remembrance',
        dedupeKey: `adhkar-${row.kind}-${date}`,
      });
      await s.db.query(
        'update devotional_reminders set last_local_date = $3 where user_id = $1 and kind = $2 and enabled = true',
        [row.user_id, row.kind, date],
      );
      due++;
    } catch (error) {
      log.error('scheduler.adhkar_routine_failed', { error });
    }
  }
  return due;
}
