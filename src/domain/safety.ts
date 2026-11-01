/**
 * Child-safety & community policy — ENFORCED IN LOGIC, not just hidden in UI.
 *
 * Every community write (message, reaction, join, direct contact) goes through
 * these functions inside the community service. UI reads the same policy to
 * explain *why* something is unavailable, but hiding a button is never the
 * only protection.
 */
import type { AgeBand } from './types';

export interface ParentalSettings {
  /** Parent/guardian must approve each circle a child joins. */
  approveCircles: boolean;
  /** Children may only use pre-written encouragement replies. */
  quickRepliesOnly: boolean;
  /** Daily time limit in minutes (0 = none). */
  dailyMinutes: number;
  /** Circles a guardian has approved. */
  approvedCircles: string[];
}

export const DEFAULT_PARENTAL: ParentalSettings = {
  approveCircles: true,
  quickRepliesOnly: false,
  dailyMinutes: 45,
  approvedCircles: [],
};

export interface SafetyPolicy {
  ageBand: AgeBand;
  /** Private 1:1 messages between members. Never for children, in any direction. */
  directMessages: boolean;
  /** Links in messages. */
  links: boolean;
  /** Free-text messages (vs. quick encouragement replies only). */
  freeText: boolean;
  /** Personal information is blocked (children) or held for review (others). */
  piiAction: 'block' | 'hold';
  /** Circles must be moderated and in the member's age band. */
  moderatedOnly: boolean;
  ageMatchedCirclesOnly: boolean;
  requiresGuardianApproval: boolean;
  /** Public profile fields. Location is never public for anyone. */
  publicFields: ('name' | 'avatar' | 'circles' | 'progress')[];
  /** Memory categories that may be enabled. */
  memoryAllowed: ('style' | 'topics' | 'schedule' | 'conversations')[];
}

export function getSafetyPolicy(ageBand: AgeBand, parental: ParentalSettings = DEFAULT_PARENTAL): SafetyPolicy {
  if (ageBand === 'child') {
    return {
      ageBand,
      directMessages: false,
      links: false,
      freeText: !parental.quickRepliesOnly,
      piiAction: 'block',
      moderatedOnly: true,
      ageMatchedCirclesOnly: true,
      requiresGuardianApproval: parental.approveCircles,
      publicFields: ['avatar'],
      memoryAllowed: ['style', 'topics'],
    };
  }
  if (ageBand === 'teen') {
    return {
      ageBand,
      directMessages: false,
      links: false,
      freeText: true,
      piiAction: 'block',
      moderatedOnly: true,
      ageMatchedCirclesOnly: true,
      requiresGuardianApproval: false,
      publicFields: ['name', 'avatar'],
      memoryAllowed: ['style', 'topics', 'schedule'],
    };
  }
  return {
    ageBand,
    directMessages: true,
    links: true,
    freeText: true,
    piiAction: 'hold',
    moderatedOnly: false,
    requiresGuardianApproval: false,
    publicFields: ['name', 'avatar', 'circles', 'progress'],
    memoryAllowed: ['style', 'topics', 'schedule', 'conversations'],
    // Adults never join children's or teens' circles; only vetted mentors (assigned server-side) do.
    ageMatchedCirclesOnly: true,
  };
}

/* ── Direct contact ─────────────────────────────────────────── */

/**
 * Stranger-to-child private contact is impossible: if EITHER side is a child
 * or teen, direct messages are refused — regardless of which side asks.
 */
export function canDirectMessage(from: AgeBand, to: AgeBand): boolean {
  if (from !== 'adult' || to !== 'adult') return false;
  return getSafetyPolicy(from).directMessages && getSafetyPolicy(to).directMessages;
}

/* ── Circles ────────────────────────────────────────────────── */

export interface CircleAccessInfo {
  id: string;
  ageBand: AgeBand;
  moderated: boolean;
}

export type JoinDecision = { ok: true } | { ok: false; reason: 'age-band' | 'unmoderated' | 'needs-guardian' };

export function canJoinCircle(policy: SafetyPolicy, circle: CircleAccessInfo, parental: ParentalSettings = DEFAULT_PARENTAL): JoinDecision {
  // Age bands never mix — this is what makes stranger-to-child contact impossible in circles.
  if (circle.ageBand !== policy.ageBand) return { ok: false, reason: 'age-band' };
  if (policy.moderatedOnly && !circle.moderated) return { ok: false, reason: 'unmoderated' };
  if (policy.requiresGuardianApproval && !parental.approvedCircles.includes(circle.id)) return { ok: false, reason: 'needs-guardian' };
  return { ok: true };
}

/* ── Message moderation ─────────────────────────────────────── */

export type ModerationFlag = 'phone' | 'email' | 'address' | 'link' | 'contact-request' | 'meetup' | 'unkind' | 'handle';

export type ModerationResult =
  | { status: 'ok'; flags: [] }
  | { status: 'blocked'; flags: ModerationFlag[] }
  | { status: 'held'; flags: ModerationFlag[] };

const PATTERNS: [ModerationFlag, RegExp][] = [
  // 7+ digits, allowing spaces/dashes/dots and Arabic-Indic digits
  ['phone', /(?:\+?[\d٠-٩][\s\-.()]*){7,}/u],
  ['email', /[\w.+-]+@[\w-]+\.[\w.-]+/u],
  ['link', /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|io|me|gg|app|ly|co)\b/iu],
  ['handle', /(?:^|\s)@[\w.]{3,}|\b(?:snap(?:chat)?|insta(?:gram)?|tiktok|discord|whatsapp|telegram|kik)\b|سناب|انستا|واتساب|تيليجرام|تيك ?توك/iu],
  ['address', /\b\d{1,5}\s+\w+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b|\bi live (?:at|on|in)\b|\bmy address\b|عنواني|أسكن في|ساكن في/iu],
  ['contact-request', /\b(?:dm me|message me|text me|add me|call me|send (?:me )?(?:a )?(?:pic|photo|picture)|what'?s your (?:number|address|snap|insta))\b|راسلني|كلمني خاص|ابعث(?:لي)? صورة|رقمك/iu],
  ['meetup', /\b(?:meet (?:me|up)|let'?s meet|come to my (?:house|home))\b|نتقابل|نلتقي في/iu],
  ['unkind', /\b(?:stupid|idiot|dumb|loser|hate you|shut up|ugly)\b|غبي|أكرهك|اسكت|فاشل/iu],
];

export function detectFlags(text: string): ModerationFlag[] {
  const flags: ModerationFlag[] = [];
  const emailRe = PATTERNS.find(([f]) => f === 'email')![1];
  // An email's domain would also look like a link — test links on the text without emails.
  const withoutEmails = text.replace(new RegExp(emailRe.source, 'gu'), ' ');
  for (const [flag, re] of PATTERNS) if (re.test(flag === 'link' ? withoutEmails : text)) flags.push(flag);
  return flags;
}

/**
 * Moderate a message against the author's policy.
 *  - Children/teens: personal info, contact requests, meetups, links → blocked (never sent).
 *  - Adults: personal info held for moderator review; links allowed.
 *  - Unkind words: held for a moderator for everyone (with a gentle nudge).
 */
export function moderateMessage(text: string, policy: SafetyPolicy): ModerationResult {
  const flags = detectFlags(text);
  if (flags.length === 0) return { status: 'ok', flags: [] };

  const personal = flags.filter((f) => f === 'phone' || f === 'email' || f === 'address' || f === 'handle' || f === 'contact-request' || f === 'meetup');
  const blocking: ModerationFlag[] = [];
  if (policy.piiAction === 'block') blocking.push(...personal);
  if (!policy.links && flags.includes('link')) blocking.push('link');
  if (blocking.length > 0) return { status: 'blocked', flags: [...new Set(blocking)] };

  const holding = flags.filter((f) => f !== 'link');
  if (holding.length > 0) return { status: 'held', flags: holding };
  return { status: 'ok', flags: [] };
}

/** Pre-written encouragement — always available, the only option in quick-replies-only mode. */
export const QUICK_REPLIES = [
  { en: 'Great job!', ar: 'أحسنت!' },
  { en: 'Keep going 🌿', ar: 'واصل 🌿' },
  { en: 'MashaAllah', ar: 'ما شاء الله' },
  { en: 'That was helpful', ar: 'كان ذلك مفيدًا' },
  { en: 'Proud of you', ar: 'فخور بك' },
  { en: 'Let’s continue together', ar: 'لنكمل معًا' },
  { en: 'I have a question', ar: 'عندي سؤال' },
] as const;
