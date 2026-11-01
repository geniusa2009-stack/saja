/**
 * Resolves who the caller is and what they may do — from the DATABASE, never
 * from client-supplied role or age values. Reuses the product's safety policy
 * (src/domain/safety.ts) so client and server enforce the same rules.
 */
import type { AgeBand } from '../../src/domain/types.ts';
import { getSafetyPolicy, type ParentalSettings, type SafetyPolicy } from '../../src/domain/safety.ts';
import type { Queryable } from '../db/index.ts';
import { one } from '../db/index.ts';

export type Role = 'learner' | 'guardian' | 'mentor' | 'scholar' | 'moderator' | 'admin';
export type Consent = 'not_required' | 'pending' | 'granted' | 'revoked';

export interface MemoryPrefs {
  style: boolean;
  topics: boolean;
  schedule: boolean;
  conversations: boolean;
}

export interface Access {
  userId: string;
  isGuest: boolean;
  isDemo: boolean;
  roles: Role[];
  /** The band policy uses: guardian/admin-approved band if present, else the declared band; adult if unknown. */
  ageBand: AgeBand;
  age: { declared: AgeBand | null; approved: AgeBand | null; consent: Consent };
  parental: ParentalSettings;
  policy: SafetyPolicy;
  /** Children may use community features only after a guardian has consented. */
  communityAllowed: boolean;
  memory: MemoryPrefs;
}

export const DEFAULT_MEMORY: Record<AgeBand, MemoryPrefs> = {
  child: { style: true, topics: true, schedule: false, conversations: false },
  teen: { style: true, topics: true, schedule: false, conversations: false },
  adult: { style: true, topics: true, schedule: false, conversations: false },
};

export async function loadAccess(q: Queryable, userId: string): Promise<Access | null> {
  const user = await one<{ id: string; is_guest: boolean; is_demo: boolean; deleted_at: string | null }>(q, 'select id, is_guest, is_demo, deleted_at from users where id = $1', [userId]);
  if (!user || user.deleted_at) return null;
  const roles = (await q.query<{ role: Role }>('select role from user_roles where user_id = $1', [userId])).map((r) => r.role);
  const age = await one<{ declared_band: AgeBand; approved_band: AgeBand | null; guardian_consent: Consent }>(q, 'select declared_band, approved_band, guardian_consent from age_status where user_id = $1', [userId]);
  const ps = await one<{ approve_circles: boolean; quick_replies_only: boolean; daily_minutes: number }>(q, 'select approve_circles, quick_replies_only, daily_minutes from parental_settings where child_user_id = $1', [userId]);
  const approved = (await q.query<{ circle_id: string }>('select circle_id from circle_approvals where child_user_id = $1', [userId])).map((r) => r.circle_id);
  const mem = await one<MemoryPrefs>(q, 'select style, topics, schedule, conversations from memory_preferences where user_id = $1', [userId]);

  const ageBand: AgeBand = age?.approved_band ?? age?.declared_band ?? 'adult';
  const parental: ParentalSettings = {
    approveCircles: ps?.approve_circles ?? true,
    quickRepliesOnly: ps?.quick_replies_only ?? false,
    dailyMinutes: ps?.daily_minutes ?? 45,
    approvedCircles: approved,
  };
  const policy = getSafetyPolicy(ageBand, parental);
  const allowedMem = new Set(policy.memoryAllowed);
  const memory = mem ?? DEFAULT_MEMORY[ageBand];
  return {
    userId,
    isGuest: user.is_guest,
    isDemo: user.is_demo,
    roles: roles.length ? roles : ['learner'],
    ageBand,
    age: { declared: age?.declared_band ?? null, approved: age?.approved_band ?? null, consent: age?.guardian_consent ?? 'not_required' },
    parental,
    policy,
    communityAllowed: ageBand !== 'child' || age?.guardian_consent === 'granted',
    // Categories outside the age policy are always off, whatever is stored.
    memory: {
      style: memory.style && allowedMem.has('style'),
      topics: memory.topics && allowedMem.has('topics'),
      schedule: memory.schedule && allowedMem.has('schedule'),
      conversations: memory.conversations && allowedMem.has('conversations'),
    },
  };
}

export const hasRole = (a: Access, ...roles: Role[]) => roles.some((r) => a.roles.includes(r));
