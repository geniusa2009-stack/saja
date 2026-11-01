/**
 * Knowledge service — retrieval over SAJA's curated knowledge base.
 * The offline implementation is keyword retrieval; a connected backend can
 * replace `search` with semantic retrieval without changing callers.
 */
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from '@/content/knowledge';
import type { KnowledgeEntry, TopicId } from '@/domain/types';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ]/g, '') // Arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/[’'`]/g, "'");

export interface SearchHit {
  entry: KnowledgeEntry;
  score: number;
}

// Function words never count as evidence of relevance.
const STOP = new Set(
  'the a an and or but of to in on at for with from by is are was were be been do does did what why how when where who which that this these those i you we they it my your our can could should would will about into than then there here me us them its his her their have has had not no yes please tell explain'.split(' ')
    .concat('ما ماذا لماذا كيف متى أين من هل هو هي هم في على عن إلى الى مع أن ان لا نعم هذا هذه ذلك التي الذي كان يكون أو و'.split(' ').map(normalize)),
);

export function searchKnowledge(query: string, opts: { topics?: TopicId[]; limit?: number } = {}): SearchHit[] {
  const q = normalize(query);
  const words = q
    .split(/[^\p{L}\p{N}']+/u)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/^(ال|و|ب|ل)(?=\p{L}{3,})/u, ''));
  const hits: SearchHit[] = [];
  for (const entry of KNOWLEDGE) {
    let keywordScore = 0;
    for (const k of entry.keywords) {
      const nk = normalize(k);
      if (q.includes(nk)) keywordScore += nk.includes(' ') ? 3 : 2;
    }
    const hay = normalize(`${entry.question.en} ${entry.question.ar}`);
    const overlaps = words.filter((w) => hay.includes(w)).length;
    // Grounded only if a curated keyword matched, or at least two meaningful words did.
    if (keywordScore === 0 && overlaps < 2) continue;
    let score = keywordScore + overlaps * 0.5;
    if (opts.topics?.some((t) => entry.topics.includes(t))) score += 0.25;
    hits.push({ entry, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 3);
}

export function knowledgeFor(ids: string[]): KnowledgeEntry[] {
  return ids.map((id) => KNOWLEDGE_BY_ID[id]).filter(Boolean);
}
