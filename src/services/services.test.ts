import { OfflineGuide, needsScholar, type JourneyContext } from './tutor';
import { detectMissionRefs, composeMessage, visibleMessages } from './community';
import { organizeQuestion } from './scholar';
import { searchKnowledge } from './knowledge';
import { CIRCLES, seedMessages } from '@/content/community';
import { getSafetyPolicy } from '@/domain/safety';

const ctx: JourneyContext = { name: 'Yusuf', ageBand: 'adult', locale: 'en', weakTopics: [], completedCount: 0 };

describe('Siraj (offline guide)', () => {
  const g = new OfflineGuide();

  it('greets from context, not "how can I help"', () => {
    expect(g.greet(ctx).text).toMatch(/water path/i);
    const after = g.greet({ ...ctx, completedCount: 1, lastMission: { id: 'm-five-pauses', title: { en: 'Five Calm Pauses', ar: '' }, knowledge: ['k-salah-steps'], struggled: false } });
    expect(after.text).toMatch(/Five Calm Pauses/);
    expect(after.text).toMatch(/why each step matters/i);
  });

  it('answers only from curated knowledge, with its confidence', async () => {
    const r = await g.respond({ text: 'Why do we pray five times?', ctx });
    expect(r.state).toBe('answer');
    expect(r.knowledgeId).toBe('k-five-prayers');
    expect(r.confidence).toBe('consensus');
    expect(r.demoContent).toBe(true);
  });

  it('says it is unsure instead of guessing, and routes to a scholar', async () => {
    const r = await g.respond({ text: 'What colour were the tents at Badr?', ctx });
    expect(r.state).toBe('unsure');
    expect(r.route).toEqual({ kind: 'scholar', draft: 'What colour were the tents at Badr?' });
  });

  it('never gives personal rulings', async () => {
    expect(needsScholar('Is it haram for me to take a mortgage?')).toBe(true);
    expect(needsScholar('هل يجوز لي جمع الصلاة في السفر؟')).toBe(true);
    const r = await g.respond({ text: 'Can I combine prayers while travelling for work?', ctx });
    expect(r.state).toBe('scholar');
  });

  it('works in Arabic', async () => {
    const r = await g.respond({ text: 'ما معنى السلام عليكم؟', ctx: { ...ctx, locale: 'ar' } });
    expect(r.knowledgeId).toBe('k-salam');
    expect(r.text).toMatch(/السلام/);
  });
});

describe('community', () => {
  it('turns "Mission 5" and Arabic references into mission links', () => {
    expect(detectMissionRefs('Has anyone completed Mission 5?').map((m) => m.number)).toEqual([5]);
    expect(detectMissionRefs('أنهيت المهمة ٦ اليوم').map((m) => m.number)).toEqual([6]);
    expect(detectMissionRefs('The Water Path was lovely').map((m) => m.id)).toEqual(['m-water-path']);
  });

  it('refuses to post for non-members and blocks unsafe messages from children', () => {
    const circle = CIRCLES[0];
    const kid = getSafetyPolicy('child');
    expect(composeMessage({ circle, joined: [], text: 'hi', policy: kid })).toMatchObject({ ok: false, reason: 'not-member' });
    expect(composeMessage({ circle, joined: [circle.id], text: 'my number is 0551234567', policy: kid })).toMatchObject({ ok: false, reason: 'blocked' });
    expect(composeMessage({ circle, joined: [circle.id], text: 'We start with the right side!', policy: kid })).toMatchObject({ ok: true });
    expect(composeMessage({ circle, joined: [circle.id], text: 'free text', policy: getSafetyPolicy('child', { approveCircles: true, quickRepliesOnly: true, dailyMinutes: 45, approvedCircles: [] }) })).toMatchObject({ ok: false, reason: 'free-text-disabled' });
  });

  it('hides blocked members from the conversation', () => {
    const all = seedMessages(0);
    const visible = visibleMessages(all, 'garden', ['amina']);
    expect(visible.some((m) => m.authorId === 'amina')).toBe(false);
    expect(visible.length).toBeGreaterThan(0);
  });
});

describe('scholar & knowledge', () => {
  it('organises a question without answering it and strips personal details', () => {
    const o = organizeQuestion('i am travelling for a week call me 0551234567 how do i pray');
    expect(o.question).toMatch(/\?$/);
    expect(o.question).toMatch(/number removed/);
    expect(o.removedPersonalInfo).toBe(true);
    expect(o.topic).toBe('prayer');
    expect(o.clarifiers.length).toBeGreaterThan(0);
  });

  it('retrieves knowledge in both languages', () => {
    expect(searchKnowledge('how do I do wudu')[0].entry.id).toBe('k-wudu');
    expect(searchKnowledge('ما هي أركان الإسلام')[0].entry.id).toBe('k-pillars');
  });
});
