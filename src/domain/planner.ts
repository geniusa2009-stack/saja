/**
 * Personal day planner. Builds a realistic, gentle plan around fixed
 * commitments and prayer times, and adapts to what the person says
 * ("I'm busy today", "exam tomorrow", "only 20 minutes").
 *
 * Principles: suggestions, not obligations. Never shame. Prayer times are
 * anchors shown with respect, not tasks to "prove".
 */
import type { GoalId, L10n, Locale } from './types';
import type { PrayerTimes } from './prayerTimes';
import { PRAYERS } from './prayerTimes';

export interface Commitment {
  id: string;
  label: string;
  start: number; // hours
  end: number;
  days: number[]; // 0 = Sunday
}

export interface DayPrefs {
  wake: number;
  sleep: number;
  commitments: Commitment[];
  studyTime: 'morning' | 'afternoon' | 'evening';
  learningMinutes: number;
  reminderStyle: 'gentle' | 'minimal' | 'off';
}

export const DEFAULT_PREFS: DayPrefs = {
  wake: 6.5,
  sleep: 22,
  commitments: [{ id: 'school', label: 'School / work', start: 8, end: 14.5, days: [1, 2, 3, 4, 5] }],
  studyTime: 'afternoon',
  learningMinutes: 20,
  reminderStyle: 'gentle',
};

export type Constraint =
  | { kind: 'busy' }
  | { kind: 'exam'; when: 'today' | 'tomorrow' }
  | { kind: 'minutes'; value: number }
  | { kind: 'tired' }
  | { kind: 'free' };

export type PlanKind = 'prayer' | 'commitment' | 'study' | 'break' | 'review' | 'mission' | 'quran' | 'reflection' | 'focus';

export interface PlanItem {
  id: string;
  kind: PlanKind;
  start: number;
  minutes: number;
  title: L10n;
  prayer?: (typeof PRAYERS)[number];
  missionId?: string;
}

export interface PlanInput {
  prefs: DayPrefs;
  prayerTimes: PrayerTimes;
  weekday: number;
  now: number;
  constraints: Constraint[];
  goals: GoalId[];
  mission?: { id: string; title: L10n; minutes: number };
}

/* ── Natural-language constraints (EN + AR) ─────────────────── */

const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export function parseConstraints(text: string): Constraint[] {
  const t = toLatinDigits(text.toLowerCase());
  const out: Constraint[] = [];
  const minutes = t.match(/(\d{1,3})\s*(?:min|mins|minutes|m\b|دقيقة|دقائق|د\b)/);
  const hours = t.match(/(\d(?:\.\d)?)\s*(?:hour|hours|hr|hrs|ساعة|ساعات)/);
  if (minutes) out.push({ kind: 'minutes', value: Math.min(240, +minutes[1]) });
  else if (hours) out.push({ kind: 'minutes', value: Math.min(240, Math.round(+hours[1] * 60)) });
  if (/\b(exam|test|quiz)\b|امتحان|اختبار/.test(t)) {
    out.push({ kind: 'exam', when: /\b(today|this (morning|afternoon))\b|اليوم/.test(t) && !/tomorrow|غد|بكرة|بكره/.test(t) ? 'today' : 'tomorrow' });
  }
  if (/\b(busy|packed|no time|hectic)\b|مشغول|مشغولة|ما عندي وقت|ليس لدي وقت|زحمة/.test(t)) out.push({ kind: 'busy' });
  if (/\b(tired|exhausted|sick|unwell|low energy)\b|تعبان|تعبانة|متعب|مريض|مرهق/.test(t)) out.push({ kind: 'tired' });
  if (/\b(free|day off|holiday|weekend|nothing planned)\b|فاضي|فاضية|إجازة|عطلة/.test(t)) out.push({ kind: 'free' });
  return out;
}

/* ── Planning ───────────────────────────────────────────────── */

interface Block {
  start: number;
  end: number;
}

const PRAYER_BLOCK_MIN = 15;
const PRAYER_TITLES: Record<(typeof PRAYERS)[number], L10n> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
};

function freeWindows(busy: Block[], from: number, to: number): Block[] {
  const sorted = [...busy].filter((b) => b.end > from && b.start < to).sort((a, b) => a.start - b.start);
  const out: Block[] = [];
  let cursor = from;
  for (const b of sorted) {
    if (b.start > cursor) out.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) out.push({ start: cursor, end: to });
  return out.filter((w) => w.end - w.start >= 5 / 60);
}

/** Total minutes of suggested learning/focus (excludes prayers & fixed commitments). */
export function suggestedMinutes(plan: PlanItem[]): number {
  return plan.filter((p) => p.kind !== 'prayer' && p.kind !== 'commitment').reduce((a, p) => a + p.minutes, 0);
}

export function buildPlan(input: PlanInput): PlanItem[] {
  const { prefs, prayerTimes, weekday, now, constraints, goals, mission } = input;
  const has = (k: Constraint['kind']) => constraints.some((c) => c.kind === k);
  const exam = constraints.find((c): c is Extract<Constraint, { kind: 'exam' }> => c.kind === 'exam');
  const minutesCap = constraints.find((c): c is Extract<Constraint, { kind: 'minutes' }> => c.kind === 'minutes')?.value;

  const items: PlanItem[] = [];

  // 1. Anchors: prayer times (always shown, never "tasks").
  for (const p of PRAYERS) {
    items.push({ id: `prayer-${p}`, kind: 'prayer', prayer: p, start: prayerTimes[p], minutes: PRAYER_BLOCK_MIN, title: PRAYER_TITLES[p] });
  }
  // 2. Fixed commitments for today.
  for (const c of prefs.commitments.filter((c) => c.days.includes(weekday))) {
    items.push({ id: `c-${c.id}`, kind: 'commitment', start: c.start, minutes: Math.round((c.end - c.start) * 60), title: { en: c.label, ar: c.label } });
  }

  // 3. What we'd like to fit, in priority order.
  const wishes: Omit<PlanItem, 'start'>[] = [];
  if (exam) {
    wishes.push({ id: 'study', kind: 'study', minutes: 30, title: { en: exam.when === 'today' ? 'Final review for your exam' : 'Study for tomorrow’s exam', ar: exam.when === 'today' ? 'مراجعة أخيرة للامتحان' : 'مذاكرة لامتحان الغد' } });
    wishes.push({ id: 'break', kind: 'break', minutes: 10, title: { en: 'Break — water, stretch, breathe', ar: 'استراحة — ماء وتمدد وتنفس' } });
    wishes.push({ id: 'review', kind: 'review', minutes: 20, title: { en: 'Light review & practice questions', ar: 'مراجعة خفيفة وأسئلة تدريب' } });
  }
  const missionMinutes = has('busy') || has('tired') || exam ? Math.min(mission?.minutes ?? 5, 5) : mission?.minutes ?? 5;
  wishes.push({
    id: 'mission',
    kind: 'mission',
    missionId: mission?.id,
    minutes: missionMinutes,
    title: mission ? mission.title : { en: 'One learning mission', ar: 'مهمة تعلّم واحدة' },
  });
  if (goals.includes('quran') && !has('busy') && !exam) {
    wishes.push({ id: 'quran', kind: 'quran', minutes: has('free') ? 15 : 10, title: { en: 'Read one page of Qur’an', ar: 'قراءة صفحة من القرآن' } });
  }
  if (has('free')) {
    wishes.push({ id: 'focus', kind: 'focus', minutes: 20, title: { en: 'Explore a new place in the world', ar: 'استكشف مكانًا جديدًا في العالم' } });
  }
  wishes.push({ id: 'reflection', kind: 'reflection', minutes: has('busy') || has('tired') ? 3 : 5, title: { en: 'Evening reflection', ar: 'تأمل المساء' } });

  // 4. Respect "only N minutes": keep highest-priority wishes, shrinking the last one to fit.
  const budgetBase = minutesCap ?? (has('busy') ? 15 : has('tired') ? 12 : Infinity);
  let budget = budgetBase;
  const chosen: Omit<PlanItem, 'start'>[] = [];
  for (const w of wishes) {
    if (budget <= 0) break;
    if (w.minutes <= budget) {
      chosen.push(w);
      budget -= w.minutes;
    } else if (budget >= 3 && w.kind !== 'break') {
      chosen.push({ ...w, minutes: Math.floor(budget) });
      budget = 0;
    }
  }
  // Reflection is the gentlest thing to keep; if it was dropped and time remains, it's fine to leave it.

  // 5. Place into free time after now, preferring the person's study window.
  const busyBlocks: Block[] = items.map((i) => ({ start: i.start, end: i.start + i.minutes / 60 }));
  const pref = prefs.studyTime === 'morning' ? prefs.wake + 0.5 : prefs.studyTime === 'afternoon' ? 15.5 : 19;
  const dayStart = Math.max(now, prefs.wake);

  for (const w of chosen) {
    const preferredStart =
      w.kind === 'reflection' ? Math.max(prayerTimes.isha + 0.3, dayStart) : w.kind === 'quran' ? Math.max(prayerTimes.fajr + 0.3, dayStart) : Math.max(pref, dayStart);
    const place = (from: number) => freeWindows(busyBlocks, from, prefs.sleep).find((win) => (win.end - win.start) * 60 >= w.minutes);
    const win = place(preferredStart) ?? place(dayStart);
    if (!win) continue;
    const start = Math.round(win.start * 12) / 12; // snap to 5 min
    items.push({ ...w, start });
    busyBlocks.push({ start, end: start + w.minutes / 60 });
  }

  return items.sort((a, b) => a.start - b.start);
}

/** The assistant's one-line summary of how the plan responded. */
export function planHeadline(constraints: Constraint[], locale: Locale): string {
  const en = locale === 'en';
  const exam = constraints.find((c) => c.kind === 'exam');
  const minutes = constraints.find((c): c is Extract<Constraint, { kind: 'minutes' }> => c.kind === 'minutes');
  if (exam) return en ? 'You have an exam — I made room to study, rest, review, and still keep one small mission.' : 'لديك امتحان — جعلت وقتًا للمذاكرة والراحة والمراجعة، مع مهمة صغيرة واحدة.';
  if (minutes) return en ? `Only ${minutes.value} minutes? Here’s a plan that fits — prayers stay as anchors.` : `لديك ${minutes.value} دقيقة فقط؟ هذه خطة تناسبها، والصلوات تبقى محطات ثابتة.`;
  if (constraints.some((c) => c.kind === 'busy')) return en ? 'A busy day — I kept things light. Small and consistent is beloved.' : 'يوم مزدحم — جعلت الخطة خفيفة. القليل الدائم محبوب.';
  if (constraints.some((c) => c.kind === 'tired')) return en ? 'Go gently today. A short mission and a quiet reflection are enough.' : 'ترفّق بنفسك اليوم. مهمة قصيرة وتأمل هادئ يكفيان.';
  if (constraints.some((c) => c.kind === 'free')) return en ? 'A free day! Room to explore somewhere new in the world.' : 'يوم فارغ! هناك وقت لاستكشاف مكان جديد في العالم.';
  return en ? 'Here’s a calm plan around your day.' : 'هذه خطة هادئة حول يومك.';
}
