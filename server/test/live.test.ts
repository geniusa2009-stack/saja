// @vitest-environment node
/**
 * LIVE integration tests — real, minimal requests to every CONFIGURED provider.
 * Opt-in only (they use your free-tier allowance):  npm run test:live
 * Providers without a key are reported as skipped ("NOT CONFIGURED"), never passed.
 * Prompts contain no personal data; nothing is printed except outcomes.
 */
import { loadConfig } from '../config.ts';
import { createEmbeddings, createProvider } from '../ai/providers.ts';
import { PROVIDER_CAPABILITIES, PROVIDER_IDS } from '../ai/models.ts';
import { EMBED_DIM } from '../ai/embeddings.ts';

const LIVE = process.env.SAJA_LIVE_TESTS === '1';
const config = loadConfig();
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const ANSWER = { type: 'object', additionalProperties: false, properties: { answer: { type: 'string' } }, required: ['answer'] };

describe.skipIf(!LIVE)('live providers', () => {
  for (const id of PROVIDER_IDS) {
    const p = config.ai.providers[id];
    const label = `${PROVIDER_CAPABILITIES[id].label} (${p.model})`;
    const run = p.configured ? it : it.skip;
    const name = (what: string) => (p.configured ? `${label}: ${what}` : `${label}: NOT CONFIGURED (${PROVIDER_CAPABILITIES[id].keyVar} unset)`);

    run(name('English, schema-valid JSON'), async () => {
      const r = await createProvider(config, id)!.structured<{ answer: string }>({
        purpose: 'health-check',
        system: 'Answer in one short English sentence.',
        user: 'How many daily prayers are there in Islam? Answer with the number in words.',
        schema: ANSWER,
        maxTokens: 120,
        effort: 'low',
      });
      expect(r.ok, r.ok ? '' : `${r.reason} ${r.detail ?? ''}`).toBe(true);
      if (r.ok) expect(r.data.answer.toLowerCase()).toMatch(/five|5/);
    }, 60_000);

    run(name('Arabic, schema-valid JSON'), async () => {
      const r = await createProvider(config, id)!.structured<{ answer: string }>({
        purpose: 'health-check',
        system: 'أجب بجملة عربية قصيرة واحدة.',
        user: 'كم عدد الصلوات المفروضة في اليوم؟',
        schema: ANSWER,
        maxTokens: 160,
        effort: 'low',
      });
      expect(r.ok, r.ok ? '' : `${r.reason} ${r.detail ?? ''}`).toBe(true);
      if (r.ok) expect(r.data.answer).toMatch(/[؀-ۿ]/);
    }, 60_000);

    const vision = p.configured && p.capabilities.includes('vision');
    (vision ? it : it.skip)(vision ? `${label}: image input` : `${label}: image input NOT TESTED (${p.configured ? 'no vision capability declared' : 'not configured'})`, async () => {
      const r = await createProvider(config, id)!.structured<{ answer: string }>({
        purpose: 'health-check',
        system: 'Describe the image in at most five words.',
        user: [{ type: 'image', mediaType: 'image/png', base64: PNG_1PX }, { type: 'text', text: 'What is this?' }],
        schema: ANSWER,
        maxTokens: 120,
        effort: 'low',
      });
      expect(r.ok, r.ok ? '' : `${r.reason} ${r.detail ?? ''}`).toBe(true);
    }, 60_000);
  }

  const emb = config.ai.embeddings;
  (emb.provider === 'local' ? it.skip : it)(emb.provider === 'local' ? 'embeddings: NOT CONFIGURED (local lexical)' : `embeddings: ${emb.provider} ${emb.model}`, async () => {
    const [a, b, c] = await createEmbeddings(config).embed(['How do I perform wudu?', 'كيف أتوضأ؟', 'What is the capital of Peru?'], 'query');
    expect(a).toHaveLength(EMBED_DIM);
    const cos = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);
    // The Arabic question means the same thing; the unrelated one should be further away.
    expect(cos(a, b)).toBeGreaterThan(cos(a, c));
  }, 60_000);
});
