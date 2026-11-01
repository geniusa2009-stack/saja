// @vitest-environment node
import { createTestServer, traveller, account, makeScholar } from './harness.ts';
import { validateUpload } from '../modules/trust/uploads.ts';
import type { AIProvider, StructuredRequest } from '../ai/types.ts';

const SCRIPT =
  'Ramadan is a special month. Fasting in Ramadan is one of the five pillars of Islam, and the Qur’an was first revealed in this month. Every child must fast from the age of seven, and Laylat al-Qadr is the 27th night. The Prophet ﷺ said that whoever fasts the first day will never feel hungry again.';
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const MP3 = Uint8Array.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]);

describe('upload validation (magic bytes, extension, size)', () => {
  it('accepts a real PNG and classifies it', () => {
    expect(validateUpload('slide.png', 'image/png', Buffer.from(PNG), 1000)).toEqual({ kind: 'image', mime: 'image/png' });
  });
  it('rejects content that does not match its declared type', () => {
    expect(() => validateUpload('slide.png', 'image/png', Buffer.from('%PDF-1.7'), 1000)).toThrow();
    expect(() => validateUpload('evil.exe', 'application/x-msdownload', Buffer.from('MZ'), 1000)).toThrow();
  });
  it('rejects a mismatched extension and oversized files', () => {
    expect(() => validateUpload('slide.pdf', 'image/png', Buffer.from(PNG), 1000)).toThrow();
    expect(() => validateUpload('slide.png', 'image/png', Buffer.from(PNG), 4)).toThrow();
  });
});

describe('AMANAH / NOUR without OCR or transcription (default local mode)', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it('audits text server-side with the same verdicts as the offline verifier', async () => {
    const c = await traveller(t.client());
    const r = await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'script', title: 'Ramadan reel', text: SCRIPT });
    expect(r.status).toBe(202);
    expect(r.data.status).toBe('completed');
    expect(r.data.claims.map((x: { verdict: string }) => x.verdict)).toEqual(['supported', 'supported', 'mismatch', 'needs-context', 'review']);
    expect(r.data.stages.map((s: { stage: string }) => s.stage)).toEqual(['ingest', 'extract', 'claims', 'sources', 'verify', 'done']);
    const mismatch = r.data.claims.find((x: { verdict: string }) => x.verdict === 'mismatch');
    expect(mismatch.suggestion.en).toMatch(/puberty/);
    expect(mismatch.evidence.length).toBeGreaterThan(0);
  });

  it('marks unmatched factual claims UNVERIFIED and never as supported', async () => {
    const c = await traveller(t.client());
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'post', text: 'Zakat was first collected in Madinah by a treasury of seven clerks.' })).data;
    expect(r.claims).toHaveLength(1);
    expect(r.claims[0].verdict).toBe('unverified');
  });

  it('reports images as unavailable when no OCR provider is configured — no fake extraction', async () => {
    const c = await traveller(t.client());
    const up = await c.upload('post.png', 'image/png', PNG);
    expect(up.status).toBe(201);
    expect(up.data.kind).toBe('image');
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'text', uploadId: up.data.id })).data;
    expect(r.input_kind).toBe('image'); // server decides the kind
    expect(r.status).toBe('unavailable');
    expect(r.error_code).toBe('ocr_unavailable');
    expect(r.claims).toHaveLength(0);
  });

  it('reports audio/video as unavailable when no transcription service is configured', async () => {
    const c = await traveller(t.client());
    const up = await c.upload('clip.mp3', 'audio/mpeg', MP3);
    const r = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'audio', uploadId: up.data.id })).data;
    expect(r.status).toBe('unavailable');
    expect(r.error_code).toBe('transcription_unavailable');
  });

  it('decodes plain-text documents and rejects disguised files at the door', async () => {
    const c = await traveller(t.client());
    const up = await c.upload('script.txt', 'text/plain', 'Every child must fast from the age of seven.');
    const r = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'document', uploadId: up.data.id })).data;
    expect(r.claims[0].verdict).toBe('mismatch');
    expect((await c.upload('photo.png', 'image/png', '%PDF-1.4 not a png')).status).toBe(415);
  });

  it('keeps uploads and audits private to their owner', async () => {
    const owner = await traveller(t.client());
    const other = await traveller(t.client());
    const up = await owner.upload('note.txt', 'text/plain', 'Fasting in Ramadan is one of the five pillars of Islam.');
    expect((await other.post('/audits?wait=1', { tool: 'nour', inputKind: 'document', uploadId: up.data.id })).status).toBe(404);
    const audit = (await owner.post('/audits?wait=1', { tool: 'nour', inputKind: 'document', uploadId: up.data.id })).data;
    expect((await other.get(`/audits/${audit.id}`)).status).toBe(404);
    expect((await other.post(`/audits/${audit.id}/claims/${audit.claims[0].id}/review`)).status).toBe(404);
    expect((await other.get('/audits')).data.audits).toHaveLength(0);
  });

  it('SUGGEST REVISION is recorded; SEND TO SCHOLAR REVIEW creates a real queued question', async () => {
    const c = await traveller(t.client());
    const a = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'script', title: 'Reel 2', text: SCRIPT })).data;
    const mismatch = a.claims.find((x: { verdict: string }) => x.verdict === 'mismatch');
    expect((await c.post(`/audits/${a.id}/claims/${mismatch.id}/revision`, { after: 'Fasting becomes obligatory at puberty.' })).status).toBe(201);
    const [rev] = await t.services.db.query<{ before_text: string; after_text: string }>('select before_text, after_text from content_revisions where audit_id = $1', [a.id]);
    expect(rev.before_text).toMatch(/age of seven/);

    const review = a.claims.find((x: { verdict: string }) => x.verdict === 'review');
    const sent = await c.post(`/audits/${a.id}/claims/${review.id}/review`);
    expect(sent.status).toBe(201);
    const mine = (await c.get('/scholar/questions')).data.questions;
    expect(mine[0].status).toBe('queued');
    expect(mine[0].question).toMatch(/hungry/);

    const scholar = await account(t.client(), 'adult', 'trust-scholar@example.com');
    await makeScholar(t.services, (await scholar.get('/auth/me')).data.user.id, 'verified');
    const inbox = (await scholar.get('/scholar/inbox')).data.questions;
    expect(inbox.find((q: { id: string }) => q.id === sent.data.questionId)?.source).toBe('amanah');
  });
});

describe('AMANAH / NOUR with a vision-capable model', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  const calls: StructuredRequest[] = [];
  const ai: AIProvider = {
    id: 'anthropic',
    model: 'test-model',
    capabilities: new Set(['text', 'structured_output', 'vision', 'pdf']),
    async structured<T>(req: StructuredRequest) {
      calls.push(req);
      const isOcr = Array.isArray(req.user) && req.user.some((b) => b.type === 'image');
      // The model reads the image, and "finds" one real claim plus one it made up.
      const data = isOcr
        ? { text: 'Every child must fast from the age of seven. Fasting in Ramadan is one of the five pillars of Islam.' }
        : { claims: ['Fasting in Ramadan is one of the five pillars of Islam.', 'Zakat is due on all houses you live in.'] };
      return { ok: true as const, data: data as T, model: 'fake', usage: { input: 1, output: 1 } };
    },
  };
  beforeAll(async () => (t = await createTestServer({ ai })), 60_000);
  afterAll(() => t.close());

  it('extracts text from an image, then verdicts come from sources — not from the model', async () => {
    const c = await traveller(t.client());
    const up = await c.upload('post.png', 'image/png', PNG);
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up.data.id })).data;
    expect(r.status).toBe('completed');
    expect(r.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toBe('ai-vision');
    expect(r.claims.map((x: { verdict: string }) => x.verdict)).toEqual(['mismatch', 'supported']);
    // A claim the model listed that is not in the extracted text is ignored.
    expect(r.claims.some((x: { text: string }) => /Zakat/.test(x.text))).toBe(false);
  });
});
