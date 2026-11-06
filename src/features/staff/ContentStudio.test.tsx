/**
 * The content studio shows what the server says — counts, states, next steps —
 * and sends only text edits and review steps; the server decides the rest.
 */
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConnection } from '@/store/connection';
import { useSettings } from '@/store/settings';
import { fakeServer, offlineFetch } from '@/test/server';
import type { Me } from '@/api/types';
import { buildMissionDefinition } from '@/domain/missionDefinitions';
import { MISSION_BY_ID, WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS } from '@/content/missions';
import { useProfile } from '@/store/profile';
import { DEFAULT_LOOK } from '@/features/character/palette';
import { HADITHS } from '@/content/hadith';
import { hadithSnapshot } from '@/domain/hadith';
import { ContentStatus, KnowledgeStudio, MissionStudio, TextsStudio } from './ContentStudio';

const me = (roles: Me['user']['roles']): Me => ({
  user: {
    id: 'u1',
    email: 'staff@example.com',
    isGuest: false,
    roles,
    ageBand: 'adult',
    age: { declared: 'adult', approved: null, consent: 'not_required' },
    communityAllowed: true,
    parental: { approveCircles: true, quickRepliesOnly: false, dailyMinutes: 45, approvedCircles: [] },
    memory: { style: true, topics: true, schedule: false, conversations: false },
  },
  profile: null,
});
const zero = { draft: 0, internal_review: 0, scholar_review: 0, approved: 0, published: 0, archived: 0 };
const counts = (total: number, demo: number, published = 0) => ({ total, byStatus: { ...zero, draft: total - published, published }, served: { published, demo, hidden: total - demo - published } });

beforeEach(() => {
  useSettings.setState({ locale: 'en' });
  useProfile.setState({ profile: { name: 'Staff', look: DEFAULT_LOOK, purpose: 'learn-more', ageBand: 'adult', level: 'beginner', goals: ['prayer'], interests: ['prayer'], modality: 'hands-on', createdAt: Date.now() } });
  useConnection.setState({ status: 'online', me: me(['moderator']) });
});
afterEach(() => {
  cleanup();
  offlineFetch();
  useConnection.setState({ status: 'offline', me: null });
});

describe('content status dashboard', () => {
  it('shows the counts the server reports, including sample scholars, and nothing more', async () => {
    fakeServer({
      '/content/status': () => [
        200,
        {
          knowledge: counts(19, 19),
          missions: counts(12, 11, 1),
          dailyDeen: { total: 19, published: 0, demo: 19, hidden: 0 },
          claimRules: { ...counts(18, 18), usedBy: ['amanah', 'nour'] },
          conceptStories: counts(4, 4),
          quizzes: counts(6, 6),
          hadith: counts(11, 11),
          scholars: { unverified: 0, pending: 1, verified: 0, suspended: 0, sample: 2 },
          scholarAnswers: { sample: 2, real: 0 },
        },
      ],
    });
    render(<ContentStatus />);
    const missions = (await screen.findByText('Missions')).closest('li')!;
    expect(within(missions).getByText('12')).toBeInTheDocument();
    expect(within(missions).getByText('Published').nextSibling).toHaveTextContent('1');
    expect(within(missions).getByText('Demo').nextSibling).toHaveTextContent('11');
    const scholars = screen.getByText('Scholar profiles').closest('li')!;
    expect(within(scholars).getByText('Verified').nextSibling).toHaveTextContent('0');
    expect(within(scholars).getByText('Sample').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Answers: 0 by verified scholars · 2 sample')).toBeInTheDocument();
    expect(screen.getByText(/used by both AMANAH and NOUR/)).toBeInTheDocument();
    const hadith = screen.getByText('Hadith library').closest('li')!;
    expect(within(hadith).getByText('11', { selector: '.t-h3' })).toBeInTheDocument();
    expect(within(hadith).getByText('Demo').nextSibling).toHaveTextContent('11');
  });
});

const water = () => ({
  ...buildMissionDefinition(MISSION_BY_ID['m-water-path'], { WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS }),
  version: 2,
  status: 'in-review',
  reviewStatus: 'draft',
  provenance: { origin: 'staff-edit', basedOnVersion: 1 },
  changeNote: 'Clarify',
});

function missionServer() {
  const def = water();
  def.payload = { type: 'wudu-journey', steps: WUDU_STEPS.map((s, i) => (i === 0 ? { ...s, label: { en: 'Intention (draft wording)', ar: 'النية (مسودة)' } } : s)) };
  return fakeServer({
    '/missions/review/queue': () => [200, { missions: [{ id: 'm-water-path', number: 1, review_status: 'draft', current_version: 2, published_version: null, demo_version: 1, is_demo: true, updated_at: new Date().toISOString(), title: def.title, interaction_type: 'wudu-journey' }] }],
    '/missions/m-water-path?as=staff': () => [200, def],
    '/missions/m-water-path/texts': () => [200, { version: 2, texts: [{ path: 'payload.steps.0.label', en: 'Intention (draft wording)', ar: 'النية (مسودة)' }, { path: 'title', en: 'The Water Path', ar: 'درب الماء' }] }],
    '/missions/m-water-path/history': () => [200, { status: 'draft', next: ['internal_review'], versions: [{ version: 2, change_note: 'Clarify', created_at: new Date().toISOString(), provenance: { origin: 'staff-edit' } }], reviews: [] }],
    'POST /missions/m-water-path/draft': () => [201, { version: 2, inPlace: true, changed: 1 }],
    'POST /missions/m-water-path/review': () => [200, { from: 'draft', to: 'internal_review', version: 2 }],
  });
}

describe('mission review', () => {
  it('lists missions with their honest state and previews the draft with the real mechanic', async () => {
    missionServer();
    render(<MissionStudio />);
    expect(await screen.findByText('Learners: demo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('This version: draft / in review')).toBeInTheDocument();
    // The preview plays the version under review, not the bundled copy.
    expect(await screen.findByText(/Intention \(draft wording\)/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/Nothing is recorded/)).toBeInTheDocument();
  });

  it('a staff device without a traveller gets an explanation instead of a crash', async () => {
    useProfile.setState({ profile: null });
    missionServer();
    render(<MissionStudio />);
    await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
    expect(await screen.findByText(/Create a traveller on this device/)).toBeInTheDocument();
  });

  it('moderators can read texts but not edit them; review steps come from the server', async () => {
    const calls = missionServer();
    render(<MissionStudio />);
    await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Texts' }));
    expect(screen.getByText(/Only admins and scholars can edit/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save .* changes/ })).toBeNull();
    const scope = screen.getByRole('textbox', { name: /scope/i });
    await userEvent.type(scope, 'full text, both languages');
    await userEvent.click(screen.getByRole('button', { name: '→ Internal review' }));
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/review'))?.body).toEqual({ to: 'internal_review', scope: 'full text, both languages' });
  });

  it('a scholar saves only the texts that changed, with a change note', async () => {
    useConnection.setState({ status: 'online', me: me(['scholar']) });
    const calls = missionServer();
    render(<MissionStudio />);
    await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Texts' }));
    const title = screen.getAllByRole('textbox', { name: 'English' })[1];
    await userEvent.clear(title);
    await userEvent.type(title, 'The Path of Water');
    await userEvent.type(screen.getByRole('textbox', { name: 'Change note' }), 'Title wording');
    await userEvent.click(screen.getByRole('button', { name: 'Save 1 changes as draft' }));
    const post = calls.find((c) => c.method === 'POST' && c.url.endsWith('/draft'));
    expect(post?.body).toEqual({ texts: [{ path: 'title', en: 'The Path of Water', ar: 'درب الماء' }], changeNote: 'Title wording' });
  });
});

describe('knowledge editor', () => {
  it('opens a document with provenance and trail; only writers see “Edit” and “New”', async () => {
    fakeServer({
      '/knowledge/review/queue': () => [200, { documents: [{ id: 'k-wudu', review_status: 'draft', current_version: 1, published_version: null, demo_version: 1, served_version: 1, is_demo: true, updated_at: new Date().toISOString(), question: { en: 'How is wudu performed?', ar: 'كيف يكون الوضوء؟' } }] }],
      '/knowledge/k-wudu?as=staff': () => [
        200,
        { id: 'k-wudu', version: 1, status: 'demo', reviewStatus: 'draft', confidence: 'consensus', topics: ['prayer'], content: { question: { en: 'How is wudu performed?', ar: 'كيف يكون الوضوء؟' }, simple: { en: 'Wash in order.', ar: 'اغسل بالترتيب.' } }, evidence: [{ kind: 'quran', ref: "Qur'an 5:6", text: { en: 'O you who believe…', ar: 'يا أيها الذين آمنوا…' }, rendering: 'meaning' }], provenance: { origin: 'seed-demo' }, changeNote: null },
      ],
      '/knowledge/k-wudu/reviews': () => [200, { status: 'draft', next: ['internal_review'], reviews: [] }],
      '/knowledge/k-wudu/versions': () => [200, { versions: [{ version: 1, change_note: null, created_at: new Date().toISOString(), provenance: { origin: 'seed-demo' }, published: false }] }],
    });
    render(<KnowledgeStudio />);
    expect(screen.queryByRole('button', { name: 'New document' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
    expect(await screen.findByText('This version: demo')).toBeInTheDocument();
    expect(screen.getByText(/Provenance: seed-demo/)).toBeInTheDocument();
    expect(screen.getByText(/Qur'an 5:6/)).toBeInTheDocument();
    expect(screen.getByText('No review steps yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit as draft' })).toBeNull();
    expect(screen.queryByText(/Verified scholar/)).toBeNull();
  });
});

describe('hadith review', () => {
  it('shows the exact Arabic, reference and grading snapshot, and sends only a review step', async () => {
    const calls = fakeServer({
      '/content/blocks': () => [
        200,
        {
          blocks: [
            {
              kind: 'hadith',
              id: HADITHS[0].id,
              current_version: 1,
              published_version: null,
              review_status: 'draft',
              is_demo: true,
              updated_at: new Date().toISOString(),
              next: ['internal_review'],
              content: { record: hadithSnapshot(HADITHS[0]) },
            },
          ],
        },
      ],
      '/content/blocks/hadith/h-bukhari-1/reviews': () => [200, { reviews: [] }],
      'POST /content/blocks/hadith/h-bukhari-1/review': () => [200, { from: 'draft', to: 'internal_review', version: 1 }],
    });
    render(<TextsStudio />);
    await userEvent.click(await screen.findByRole('button', { name: /Hadith · 1/ }));
    expect(screen.getByText(/Sahih al-Bukhari 1/)).toBeInTheDocument();
    expect(screen.getByText(/الأَعْمَالُ/)).toBeInTheDocument();
    expect(screen.getByText('Learners: demo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText('No review steps yet.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /scope/i }), 'Arabic and meaning');
    await userEvent.click(screen.getByRole('button', { name: '→ Internal review' }));
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/review'))?.body).toEqual({ to: 'internal_review', scope: 'Arabic and meaning' });
  });
});
