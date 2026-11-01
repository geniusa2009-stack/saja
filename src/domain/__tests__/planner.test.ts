import { buildPlan, parseConstraints, suggestedMinutes, DEFAULT_PREFS } from '../planner';

const prayerTimes = { fajr: 4.9, sunrise: 6.1, dhuhr: 12.2, asr: 15.5, maghrib: 18.2, isha: 19.7 };
const base = { prefs: DEFAULT_PREFS, prayerTimes, weekday: 2, now: 7, goals: ['quran' as const], mission: { id: 'm-first-word', title: { en: 'The First Word', ar: 'الكلمة الأولى' }, minutes: 4 } };

describe('day planner', () => {
  it('parses English and Arabic constraints', () => {
    expect(parseConstraints('I only have 20 minutes')).toEqual([{ kind: 'minutes', value: 20 }]);
    expect(parseConstraints('I have an exam tomorrow')).toEqual([{ kind: 'exam', when: 'tomorrow' }]);
    expect(parseConstraints("I'm busy today")).toContainEqual({ kind: 'busy' });
    expect(parseConstraints('عندي امتحان بكرة')).toEqual([{ kind: 'exam', when: 'tomorrow' }]);
    expect(parseConstraints('عندي ٢٠ دقيقة فقط')).toEqual([{ kind: 'minutes', value: 20 }]);
    expect(parseConstraints('أنا مشغول اليوم')).toContainEqual({ kind: 'busy' });
  });

  it('always keeps the five prayers as anchors', () => {
    const plan = buildPlan({ ...base, constraints: [{ kind: 'busy' }] });
    expect(plan.filter((p) => p.kind === 'prayer')).toHaveLength(5);
  });

  it('builds the exam plan: study, break, review, one mission, reflection', () => {
    const plan = buildPlan({ ...base, constraints: [{ kind: 'exam', when: 'tomorrow' }] });
    const kinds = plan.map((p) => p.kind);
    expect(kinds).toEqual(expect.arrayContaining(['study', 'break', 'review', 'mission', 'reflection']));
    expect(plan.find((p) => p.kind === 'study')!.minutes).toBe(30);
    expect(plan.find((p) => p.kind === 'review')!.minutes).toBe(20);
  });

  it('fits within "only 20 minutes"', () => {
    const plan = buildPlan({ ...base, constraints: [{ kind: 'minutes', value: 20 }] });
    expect(suggestedMinutes(plan)).toBeLessThanOrEqual(20);
    expect(plan.some((p) => p.kind === 'mission')).toBe(true);
  });

  it('does not schedule anything during commitments or in the past', () => {
    const plan = buildPlan({ ...base, constraints: [] });
    for (const p of plan.filter((p) => p.kind !== 'prayer' && p.kind !== 'commitment')) {
      expect(p.start).toBeGreaterThanOrEqual(7);
      const overlapsSchool = p.start < 14.5 && p.start + p.minutes / 60 > 8;
      expect(overlapsSchool).toBe(false);
    }
  });

  it('a busy day asks for less', () => {
    const normal = suggestedMinutes(buildPlan({ ...base, constraints: [] }));
    const busy = suggestedMinutes(buildPlan({ ...base, constraints: [{ kind: 'busy' }] }));
    expect(busy).toBeLessThan(normal);
  });
});
