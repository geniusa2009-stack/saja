import type { Queryable } from '../db/index.ts';
import { one } from '../db/index.ts';
import type { Access } from './access.ts';

/** What the client learns about the caller. Authorization still happens server-side on every call. */
export async function meView(q: Queryable, a: Access) {
  const u = await one<{ email: string | null }>(q, 'select email from users where id = $1', [a.userId]);
  const p = await one<Record<string, unknown>>(
    q,
    `select display_name, locale, purpose, level, modality, goals, interests, character, onboarding_step, onboarding_completed_at, created_at
       from profiles where user_id = $1`,
    [a.userId],
  );
  return {
    user: {
      id: a.userId,
      email: u?.email ?? null,
      isGuest: a.isGuest,
      roles: a.roles,
      ageBand: a.ageBand,
      age: a.age,
      communityAllowed: a.communityAllowed,
      parental: a.parental,
      memory: a.memory,
    },
    profile: p ?? null,
  };
}
