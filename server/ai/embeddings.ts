/**
 * Embedding providers (selected in providers.ts → createEmbeddings).
 *  - Gemini embeddings (gemini.ts) when GEMINI_API_KEY is set — the default.
 *  - Voyage, an alternative remote provider, when VOYAGE_API_KEY is set.
 *  - Local lexical embeddings otherwise: signed feature hashing of normalised
 *    words + character trigrams (EN + AR). Deterministic and honest — it
 *    captures lexical overlap, not deep meaning — and the system reports it.
 */
import type { EmbeddingProvider } from './types.ts';

export const EMBED_DIM = 256;

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '') // Arabic diacritics + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[’‘`ʼ]/g, "'")
    .replace(/[̀-ͯ]/g, '');
}

const STOP = new Set(
  'the a an and or but of to in on at for with from by is are was were be been do does did what why how when where who which that this these those i you we they it my your our can could should would will about into than then there here me us them its his her their have has had not no yes please tell explain'
    .split(' ')
    .concat('ما ماذا لماذا كيف متى اين من هل هو هي هم في علي عن الي مع ان لا نعم هذا هذه ذلك التي الذي كان يكون او و'.split(' ')),
);

export function tokens(s: string): string[] {
  return normalizeText(s)
    .split(/[^\p{L}\p{N}']+/u)
    .map((w) => w.replace(/^(ال|وال|بال|لل)(?=\p{L}{2,})/u, ''))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const ARABIC = /[\u0600-\u06ff]/;

/**
 * Light stemming so word forms meet: أتوضأ ↔ الوضوء, أصلي ↔ الصلاة, prayers ↔ prayer.
 * Applied the same way to queries, documents and curated keywords. It is not a
 * morphological analyser — semantic retrieval needs GEMINI_API_KEY (or VOYAGE_API_KEY).
 */
export function stem(word: string): string {
  let w = word;
  if (ARABIC.test(w)) {
    w = w.replace(/^(وال|فال|بال|كال|لل|ال)(?=\p{L}{2,})/u, '');
    for (let i = 0; i < 2 && w.length > 3 && /^[اتينس]/.test(w); i++) w = w.slice(1); // verb prefixes (أ/ت/ي/ن/س)
    w = w.replace(/(ون|ين|ات|ان|ها|هم|كم|نا|ه|ك)$/u, (m) => (w.length - m.length >= 3 ? '' : m));
    return w.length > 2 ? w.replace(/[اوي]+$/u, '') : w;
  }
  if (w.length > 4 && !/(ss|us|is)$/.test(w)) w = w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
  if (w.length > 5) w = w.replace(/(ing|ed)$/, '');
  if (w.length > 6) w = w.replace(/ation$/, 'at').replace(/(?<=[st])ion$/, '');
  if (w.length > 4) w = w.replace(/e$/, '');
  return w;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function lexicalEmbed(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  const add = (feature: string, w: number) => {
    const h = fnv1a(feature);
    v[h % EMBED_DIM] += h & 0x80000000 ? -w : w;
  };
  for (const t of tokens(text)) {
    add(`w:${t}`, 1);
    add(`s:${stem(t)}`, 0.6);
    const padded = `^${t}$`;
    for (let i = 0; i < padded.length - 2; i++) add(`c:${padded.slice(i, i + 3)}`, 0.35);
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export const localEmbeddings: EmbeddingProvider = {
  id: 'local-lexical-v3',
  dimensions: EMBED_DIM,
  async embed(texts) {
    return texts.map(lexicalEmbed);
  },
};

export function voyageEmbeddings(apiKey: string, model: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): EmbeddingProvider {
  return {
    id: `voyage:${model}:${EMBED_DIM}`,
    dimensions: EMBED_DIM,
    async embed(texts, kind) {
      const res = await fetchImpl('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: texts, model, input_type: kind, output_dimension: EMBED_DIM }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status}`);
      const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}

export const toPgVector = (v: number[]) => `[${v.map((x) => Number(x.toFixed(6))).join(',')}]`;
