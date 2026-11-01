/**
 * Verification pipeline shared by AMANAH (creators) and NOUR (multimodal checks).
 *
 *   input → [OCR / transcription] → claim extraction → source retrieval → verification → result
 *
 * Text is processed fully on-device against SAJA's curated claim rules.
 * OCR and speech transcription require the NOUR backend; when it isn't
 * configured we say so plainly and let the person paste the text instead —
 * we never pretend to have read an image or heard an audio file.
 */
import type { Evidence, L10n, VerifiedClaim } from '@/domain/types';
import { KNOWLEDGE_BY_ID } from '@/content/knowledge';
import { ATTRIBUTION, CLAIM_RULES, CLAIM_SIGNALS, OPINION } from '@/content/claims';

export type SourceKind = 'text' | 'post' | 'article' | 'script' | 'transcript' | 'image' | 'screenshot' | 'audio' | 'video';

export type Stage = 'ingest' | 'transcribe' | 'claims' | 'sources' | 'verify' | 'done';

export const STAGES: Stage[] = ['ingest', 'transcribe', 'claims', 'sources', 'verify', 'done'];

export interface VerificationInput {
  kind: SourceKind;
  text?: string;
  file?: { name: string; type: string; size: number };
}

export interface VerificationResult {
  claims: VerifiedClaim[];
  sentences: { text: string; claimId?: string }[];
  counts: Record<VerifiedClaim['verdict'], number>;
}

export class TranscriptionUnavailableError extends Error {
  constructor(public readonly kind: SourceKind) {
    super(`Transcription for ${kind} requires the NOUR service, which is not connected in this build.`);
    this.name = 'TranscriptionUnavailableError';
  }
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?؟。])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

/** Split compound sentences ("X, and Y") so each claim gets its own verdict. */
function splitClauses(sentence: string): string[] {
  const parts = sentence.split(/,\s+(?:and|but)\s+|،\s*(?:و|لكن)\s*|;\s+/iu).map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 && parts.every((p) => p.split(/\s+/).length >= 4) ? parts : [sentence];
}

export function isClaim(sentence: string): boolean {
  if (OPINION.test(sentence.trim())) return false;
  return CLAIM_SIGNALS.some((re) => re.test(sentence));
}

function evidenceFor(ids: string[]): Evidence[] {
  return ids.flatMap((id) => KNOWLEDGE_BY_ID[id]?.evidence ?? []);
}

/** Words that make a claim a matter of religious judgment — those always need a human. */
const JUDGMENT = /\b(haram|halal|obligatory|forbidden|fard|wajib|must|sinful|allowed|permissible|makruh|bid'?ah)\b|حرام|حلال|واجب|فرض|يجب|محرم|بدعة|مكروه/iu;

const UNVERIFIED_EXPLANATION: L10n = {
  en: 'No source in SAJA’s knowledge base confirms or contradicts this exact claim. It is unverified — not wrong, just not checked.',
  ar: 'لا يوجد في قاعدة معرفة سجى مصدر يؤكد هذه العبارة أو ينفيها. هي غير متحقَّق منها — ليست خاطئة بالضرورة، لكنها لم تُفحص.',
};

const REVIEW_EXPLANATION: L10n = {
  en: 'SAJA’s knowledge base has no verified source for this specific claim. A human reviewer should check it before publishing.',
  ar: 'لا يوجد في قاعدة معرفة سجى مصدر موثّق لهذه العبارة تحديدًا، وينبغي أن يراجعها مختص قبل النشر.',
};
const ATTRIBUTION_EXPLANATION: L10n = {
  en: 'This attributes words to the Prophet ﷺ. Every attribution must be matched to a named, graded source by a qualified reviewer.',
  ar: 'هذه العبارة تنسب كلامًا إلى النبي ﷺ، وكل نسبة يجب أن يطابقها مختص بمصدر مسمّى ومحكوم عليه.',
};

/** Typographic quotes (’ ‘ ` ʼ) must not defeat matching of words like Qur’an. */
const normalizeQuotes = (s: string) => s.replace(/[’‘`ʼ]/g, "'");

export function verifyClaim(text: string, id: string): VerifiedClaim {
  const probe = normalizeQuotes(text);
  for (const rule of CLAIM_RULES) {
    if (!rule.patterns.some((re) => re.test(probe))) continue;
    if (rule.unless?.some((re) => re.test(probe))) continue;
    return { id, text, verdict: rule.verdict, explanation: rule.explanation, evidence: evidenceFor(rule.knowledge), suggestion: rule.suggestion };
  }
  if (ATTRIBUTION.test(text)) return { id, text, verdict: 'review', explanation: ATTRIBUTION_EXPLANATION, evidence: [] };
  if (JUDGMENT.test(text)) return { id, text, verdict: 'review', explanation: REVIEW_EXPLANATION, evidence: [] };
  return { id, text, verdict: 'unverified', explanation: UNVERIFIED_EXPLANATION, evidence: [] };
}

export function extractAndVerify(text: string): VerificationResult {
  const sentences: VerificationResult['sentences'] = [];
  const claims: VerifiedClaim[] = [];
  for (const s of splitSentences(text)) {
    for (const clause of splitClauses(s)) {
      if (isClaim(clause)) {
        const c = verifyClaim(clause, `c${claims.length + 1}`);
        claims.push(c);
        sentences.push({ text: clause, claimId: c.id });
      } else sentences.push({ text: clause });
    }
  }
  const counts: Record<VerifiedClaim['verdict'], number> = { supported: 0, 'needs-context': 0, mismatch: 0, unverified: 0, review: 0 };
  for (const c of claims) counts[c.verdict]++;
  return { claims, sentences, counts };
}

const MEDIA: SourceKind[] = ['image', 'screenshot', 'audio', 'video'];

/**
 * Runs the pipeline with stage callbacks so the UI can show real progress.
 * Stage pauses are short and exist so each step is legible, not to fake work.
 */
export async function runVerification(input: VerificationInput, onStage: (s: Stage) => void, signal?: AbortSignal): Promise<VerificationResult> {
  const step = async (s: Stage, ms: number) => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    onStage(s);
    await new Promise((r) => setTimeout(r, ms));
  };
  await step('ingest', 350);
  if (MEDIA.includes(input.kind) && !input.text) {
    onStage('transcribe');
    // OCR / speech-to-text runs on the NOUR backend (contract in docs/ARCHITECTURE.md). Not bundled on-device.
    throw new TranscriptionUnavailableError(input.kind);
  }
  await step('transcribe', MEDIA.includes(input.kind) ? 400 : 120);
  await step('claims', 500);
  const result = extractAndVerify(input.text ?? '');
  await step('sources', 450);
  await step('verify', 450);
  onStage('done');
  return result;
}
