/**
 * Moderation engine. Classifies SAFETY categories only — it never makes
 * theological judgments. Rules are deterministic and explainable; every
 * automatic action is logged and can be overridden by a human moderator.
 */
import type { SafetyPolicy } from '../../src/domain/safety.ts';
import { detectFlags } from '../../src/domain/safety.ts';
import type { Queryable } from '../db/index.ts';

export type Category = 'spam' | 'harassment' | 'personal_info' | 'scam' | 'unsafe_contact' | 'sexual' | 'threat' | 'off_platform';
export type Decision = { action: 'allow' | 'hold' | 'block'; categories: Category[]; flags: string[] };

const RULES: [Category, RegExp][] = [
  ['scam', /\b(send (me )?money|gift ?cards?|crypto|bitcoin|wire transfer|western union|investment opportunity|double your money)\b|حوّل لي|بطاقة هدايا|عملات رقمية/iu],
  ['sexual', /\b(sexy|nudes?|naked|send pics?|porn|sex)\b|عاري|جنس/iu],
  ['threat', /\b(i('| wi)ll (kill|hurt|find) you|kill you|beat you up|you('| a)re dead)\b|سأقتلك|سأؤذيك/iu],
  ['spam', /(.)\1{9,}|(https?:\/\/\S+.*){3,}/iu],
];

export function classify(text: string, policy: SafetyPolicy): Decision {
  const flags = detectFlags(text);
  const cats = new Set<Category>();
  if (flags.some((f) => ['phone', 'email', 'address'].includes(f))) cats.add('personal_info');
  if (flags.includes('handle')) cats.add('off_platform');
  if (flags.includes('contact-request') || flags.includes('meetup')) cats.add('unsafe_contact');
  if (flags.includes('unkind')) cats.add('harassment');
  if (flags.includes('link') && !policy.links) cats.add('off_platform');
  for (const [c, re] of RULES) if (re.test(text)) cats.add(c);
  const categories = [...cats];
  if (categories.length === 0) return { action: 'allow', categories, flags };

  const young = policy.ageBand !== 'adult';
  const hard: Category[] = ['sexual', 'threat', 'scam'];
  // Young people: anything that could lead to contact or harm is never sent.
  if (young && categories.some((c) => ['personal_info', 'unsafe_contact', 'off_platform', ...hard].includes(c))) return { action: 'block', categories, flags };
  // Everyone else: hold for a human moderator rather than silently dropping.
  return { action: 'hold', categories, flags };
}

export async function logAction(
  q: Queryable,
  a: { targetType: 'message' | 'dm' | 'user' | 'question' | 'circle' | 'report'; targetId: string; action: 'allow' | 'hold' | 'hide' | 'warn' | 'report' | 'escalate' | 'restore' | 'remove'; categories?: string[]; reason?: string; actorId?: string | null },
) {
  await q.query('insert into moderation_actions (target_type, target_id, action, categories, reason, actor_id, actor_kind) values ($1,$2,$3,$4,$5,$6,$7)', [
    a.targetType,
    a.targetId,
    a.action,
    a.categories ?? [],
    a.reason ?? null,
    a.actorId ?? null,
    a.actorId ? 'human' : 'system',
  ]);
}
