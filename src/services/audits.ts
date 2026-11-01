/**
 * Server-side AMANAH / NOUR audits. The server runs OCR / transcription (when
 * configured), claim detection, retrieval and the same curated verifier, and
 * persists the result. Missing capabilities come back as "unavailable" —
 * never as a guessed result.
 */
import type { VerifiedClaim } from '@/domain/types';
import { api } from '@/api/client';
import { extractAndVerify, TranscriptionUnavailableError, type SourceKind, type Stage, type VerificationResult } from './verification';

export class OcrUnavailableError extends Error {
  constructor(readonly kind: SourceKind) {
    super('Reading text from images/PDFs is not configured on this server.');
    this.name = 'OcrUnavailableError';
  }
}
export class AuditFailedError extends Error {}

interface ServerAudit {
  id: string;
  status: 'processing' | 'completed' | 'failed' | 'unavailable';
  error_code: string | null;
  extracted_text: string | null;
  stages: { stage: 'ingest' | 'extract' | 'claims' | 'sources' | 'verify' | 'done'; detail: string | null }[];
  claims: { id: string; text: string; verdict: VerifiedClaim['verdict']; explanation: VerifiedClaim['explanation']; evidence: VerifiedClaim['evidence']; suggestion: VerifiedClaim['suggestion'] | null }[];
  /** How many of the curated claim rules a scholar has reviewed and an admin published. */
  rules?: { total: number; published: number };
}

export interface ServerAuditResult extends VerificationResult {
  auditId: string;
  extractedBy: string | null;
  rules: { total: number; published: number } | null;
}

const MEDIA_KIND: Record<string, SourceKind> = { 'image/': 'image', 'audio/': 'audio', 'video/': 'video' };

export async function runServerAudit(
  input: { tool: 'amanah' | 'nour'; kind: SourceKind; title?: string; text?: string; file?: File; locale: 'en' | 'ar' },
  onStage: (s: Stage) => void,
): Promise<ServerAuditResult> {
  onStage('ingest');
  let uploadId: string | undefined;
  if (input.file) {
    uploadId = (await api.upload<{ id: string }>(input.file)).id;
    onStage('transcribe');
  }
  const inputKind = input.file ? (Object.entries(MEDIA_KIND).find(([p]) => input.file!.type.startsWith(p))?.[1] ?? 'document') : input.kind === 'image' || input.kind === 'screenshot' ? 'text' : input.kind;
  const a = await api.post<ServerAudit>('/audits?wait=1', { tool: input.tool, title: input.title || undefined, inputKind, text: input.text, uploadId, locale: input.locale }, { timeoutMs: 180_000 });
  if (a.status === 'unavailable') {
    if (a.error_code === 'ocr_unavailable') throw new OcrUnavailableError(input.kind);
    throw new TranscriptionUnavailableError(input.kind);
  }
  if (a.status !== 'completed') throw new AuditFailedError(a.error_code ?? 'failed');
  // Replay the stages the server actually went through.
  for (const st of a.stages) onStage(st.stage === 'extract' ? 'transcribe' : st.stage);

  const claims: VerifiedClaim[] = a.claims.map((c) => ({ id: c.id, text: c.text, verdict: c.verdict, explanation: c.explanation, evidence: c.evidence, suggestion: c.suggestion ?? undefined }));
  // Lay the claims back onto the text so the annotated draft still works.
  const layout = extractAndVerify(a.extracted_text ?? input.text ?? '');
  const used = new Set<string>();
  const sentences = layout.sentences.map((s) => {
    if (!s.claimId) return { text: s.text };
    const match = claims.find((c) => c.text === s.text && !used.has(c.id));
    if (match) used.add(match.id);
    return { text: s.text, claimId: match?.id };
  });
  const counts: VerificationResult['counts'] = { supported: 0, 'needs-context': 0, mismatch: 0, unverified: 0, review: 0 };
  for (const c of claims) counts[c.verdict]++;
  return { auditId: a.id, claims, sentences, counts, extractedBy: a.stages.find((s) => s.stage === 'extract')?.detail ?? null, rules: a.rules ?? null };
}

export const recordRevision = (auditId: string, claimId: string, after: string) => api.post(`/audits/${auditId}/claims/${claimId}/revision`, { after });
export const sendClaimToScholars = (auditId: string, claimId: string) => api.post<{ questionId: string }>(`/audits/${auditId}/claims/${claimId}/review`);
