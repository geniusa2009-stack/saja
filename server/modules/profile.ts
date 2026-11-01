import { isReservedName } from '../../src/domain/names.ts';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import type { Queryable } from '../db/index.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body } from '../lib/http.ts';
import { requireAccess } from '../auth/middleware.ts';
import { loadAccess, type MemoryPrefs } from '../auth/access.ts';
import { meView } from '../auth/me.ts';
import { track } from './analytics.ts';

export const Character = z.object({
  skin: z.number().int().min(0).max(5),
  hair: z.enum(['short', 'curly', 'long', 'hijab', 'kufi', 'wrap']),
  hairColor: z.number().int().min(0).max(4),
  outfit: z.enum(['thobe', 'abaya', 'tunic', 'hoodie', 'jubba']),
  outfitColor: z.number().int().min(0).max(5),
  accessory: z.enum(['none', 'glasses', 'scarf', 'satchel', 'lantern']),
});

const TOPIC = z.enum(['prayer', 'purification', 'quran', 'character', 'beliefs', 'terminology', 'fasting', 'history']);
const ProfileInput = z.object({
  displayName: z.string().trim().min(1).max(24).refine((n) => !isReservedName(n), 'This name suggests a role or verification. Please choose another.'),
  locale: z.enum(['en', 'ar']),
  purpose: z.enum(['exploring', 'new-muslim', 'learn-more', 'child']),
  level: z.enum(['beginner', 'some', 'confident']),
  modality: z.enum(['hands-on', 'visual', 'story', 'guided']),
  goals: z.array(z.enum(['prayer', 'quran', 'basics', 'character', 'community', 'consistency'])).max(6),
  interests: z.array(TOPIC).max(8),
  character: Character,
  completed: z.boolean().default(false),
});
const Band = z.enum(['child', 'teen', 'adult']);
const RANK = { child: 0, teen: 1, adult: 2 } as const;

export const profileRoutes = new Hono<AppEnv>();

/** Onboarding save / resume. Partial progress is kept with `onboarding_step`. */
profileRoutes.put('/', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const p = await body(c, ProfileInput);
  await s.db.query(
    `insert into profiles (user_id, display_name, locale, purpose, level, modality, goals, interests, character, onboarding_completed_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9, case when $10 then now() else null end)
     on conflict (user_id) do update set display_name = excluded.display_name, locale = excluded.locale, purpose = excluded.purpose,
       level = excluded.level, modality = excluded.modality, goals = excluded.goals, interests = excluded.interests,
       character = excluded.character, updated_at = now(),
       onboarding_completed_at = coalesce(profiles.onboarding_completed_at, excluded.onboarding_completed_at)`,
    [a.userId, p.displayName, p.locale, p.purpose, p.level, p.modality, p.goals, p.interests, JSON.stringify(p.character), p.completed],
  );
  if (p.completed) await track(s.db, a.userId, 'onboarding_completed', { purpose: p.purpose, band: a.ageBand });
  return c.json(await meView(s.db, (await loadAccess(s.db, a.userId))!));
});

/**
 * Age is DECLARED. Moving to an older band after declaring "child" or "teen"
 * requires a guardian/admin approval — a child cannot self-promote to adult.
 * Declaring "child" starts the guardian-consent requirement for community.
 */
profileRoutes.post('/age', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { band } = await body(c, z.object({ band: Band }));
  const current = a.age.declared;
  if (current && RANK[band] > RANK[a.ageBand]) {
    throw new AppError('forbidden', 'Changing to an older age group needs a guardian’s approval.', { needsGuardian: true });
  }
  await s.db.query(
    `insert into age_status (user_id, declared_band, guardian_consent) values ($1, $2, $3)
     on conflict (user_id) do update set declared_band = excluded.declared_band, declared_at = now(),
       guardian_consent = case when excluded.declared_band = 'child' and age_status.guardian_consent = 'not_required' then 'pending'
                               when excluded.declared_band <> 'child' then age_status.guardian_consent else age_status.guardian_consent end`,
    [a.userId, band, band === 'child' ? 'pending' : 'not_required'],
  );
  if (band === 'child') await s.db.query('insert into parental_settings (child_user_id) values ($1) on conflict do nothing', [a.userId]);
  await s.db.query(`insert into memory_preferences (user_id, schedule, conversations) values ($1, false, false) on conflict (user_id) do nothing`, [a.userId]);
  return c.json(await meView(s.db, (await loadAccess(s.db, a.userId))!));
});

/* ── What SAJA remembers ───────────────────────────────────────────── */

const MemoryInput = z.object({ style: z.boolean(), topics: z.boolean(), schedule: z.boolean(), conversations: z.boolean() });
type Category = keyof MemoryPrefs;

/** Deletes stored data for a memory category. Used when forgetting and when a category is turned off. */
export async function forgetCategory(q: Queryable, userId: string, cat: Category) {
  if (cat === 'style') await q.query(`update learner_models set model = model - 'modalities' - 'pace', updated_at = now() where user_id = $1`, [userId]);
  if (cat === 'topics') {
    await q.query(`update learner_models set model = model - 'topics' - 'concepts', updated_at = now() where user_id = $1`, [userId]);
    await q.query('delete from learning_signals where user_id = $1', [userId]);
  }
  if (cat === 'schedule') {
    await q.query('delete from day_preferences where user_id = $1', [userId]);
    await q.query('update daily_plans set note = null where user_id = $1', [userId]);
  }
  if (cat === 'conversations') await q.query('delete from tutor_messages where user_id = $1', [userId]);
}

profileRoutes.get('/memory', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const model = await one<{ model: Record<string, unknown> }>(s.db, 'select model from learner_models where user_id = $1', [a.userId]);
  const day = await one<{ prefs: unknown }>(s.db, 'select prefs from day_preferences where user_id = $1', [a.userId]);
  const convo = await one<{ n: number }>(s.db, 'select count(*)::int as n from tutor_messages where user_id = $1', [a.userId]);
  return c.json({
    settings: a.memory,
    allowed: a.policy.memoryAllowed,
    data: {
      style: model?.model ? { modalities: model.model.modalities ?? null, pace: model.model.pace ?? null } : null,
      topics: model?.model ? { topics: model.model.topics ?? null } : null,
      schedule: day?.prefs ?? null,
      conversations: { messages: convo?.n ?? 0 },
    },
  });
});

profileRoutes.put('/memory', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const next = await body(c, MemoryInput);
  const allowed = new Set(a.policy.memoryAllowed);
  for (const k of Object.keys(next) as Category[]) {
    if (next[k] && !allowed.has(k)) throw new AppError('forbidden', 'This memory category is not available for your age group.', { category: k });
  }
  await s.db.tx(async (q) => {
    await q.query(
      `insert into memory_preferences (user_id, style, topics, schedule, conversations) values ($1,$2,$3,$4,$5)
       on conflict (user_id) do update set style=$2, topics=$3, schedule=$4, conversations=$5, updated_at = now()`,
      [a.userId, next.style, next.topics, next.schedule, next.conversations],
    );
    // Turning a category off removes what was stored for it — server behaviour matches the UI.
    for (const k of Object.keys(next) as Category[]) if (a.memory[k] && !next[k]) await forgetCategory(q, a.userId, k);
  });
  return c.json({ settings: next });
});

profileRoutes.delete('/memory/:category', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const cat = z.enum(['style', 'topics', 'schedule', 'conversations']).parse(c.req.param('category'));
  await forgetCategory(s.db, a.userId, cat);
  return c.json({ ok: true });
});
