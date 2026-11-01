/**
 * AMANAH (creators) and NOUR (everyone) — one verification pipeline:
 *
 *   INGEST → EXTRACT (OCR / transcription / PDF text) → CLAIM DETECTION → SOURCE RETRIEVAL
 *   → MATCH → CONTEXT CHECK → STATUS → HUMAN REVIEW WHEN NEEDED
 *
 * Verdicts come from curated claim rules and retrieval — never from the model.
 * The model may help EXTRACT (read an image, list claims) but can never turn
 * uncertainty into "supported". Missing providers produce an explicit
 * 'unavailable' result, not a fake one.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../../context.ts';
import type { Access } from '../../auth/access.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body, Id, query } from '../../lib/http.ts';
import { userChannel } from '../../lib/bus.ts';
import { log } from '../../lib/log.ts';
import { requireAccess } from '../../auth/middleware.ts';
import { extractAndVerify, isClaim, splitSentences, verifyClaim } from '../../../src/services/verification.ts';
import type { VerifiedClaim } from '../../../src/domain/types.ts';
import { retrieve } from '../knowledge/retrieval.ts';
import { getKnowledge } from '../knowledge/store.ts';
import { organizeQuestion } from '../../../src/domain/questionOrganizer.ts';
import { track } from '../analytics.ts';
import { compact } from '../../ai/guard.ts';
import { queueFileDeletion, runFileDeletions } from '../lifecycle.ts';
import { questionEvent } from '../scholar.ts';

type Stage = 'ingest' | 'extract' | 'claims' | 'sources' | 'verify' | 'done';
const TEXT_KINDS = ['text', 'post', 'article', 'script', 'transcript'] as const;

async function stage(s: Services, auditId: string, name: Stage, detail?: string) {
  await s.db.query("update content_audits set stages = stages || $2::jsonb where id = $1", [auditId, JSON.stringify([{ stage: name, at: new Date().toISOString(), detail: detail ?? null }])]);
}

type Extracted =
  | { ok: true; text: string; via: string; detail: string }
  | { ok: false; code: 'ocr_unavailable' | 'transcription_unavailable' | 'extraction_failed' | 'empty' | 'ai_budget' };

type UploadRow = { id: string; kind: string; mime: string; storage_key: string; original_name: string | null; sha256: string };

const OCR_SYSTEM = 'Transcribe all readable text from this file exactly as written, preserving the original language. Do not summarise, translate, correct or add anything.';
const TEXT_SCHEMA = { type: 'object', additionalProperties: false, properties: { text: { type: 'string' } }, required: ['text'] };

/**
 * Turns an upload into text. Order of preference, cheapest first:
 * plain text → an earlier extraction of the SAME file by the same person (no model call)
 * → the configured OCR / transcription / frame adapters, or a provider that reads the media natively.
 * Missing capabilities are reported as such.
 */
async function extract(s: Services, a: Access, upload: UploadRow): Promise<Extracted> {
  const data = await s.storage.get(upload.storage_key);
  if (upload.kind === 'document' && upload.mime === 'text/plain') {
    const text = data.toString('utf8').trim();
    return text ? { ok: true, text, via: 'text', detail: 'text' } : { ok: false, code: 'empty' };
  }
  const previous = await one<{ extracted_text: string; stages: { stage: string; detail: string | null }[] }>(
    s.db,
    `select au.extracted_text, au.stages from content_audits au join uploads u on u.id = au.upload_id
      where au.owner_id = $1 and u.sha256 = $2 and au.status = 'completed' and au.extracted_text is not null order by au.completed_at desc limit 1`,
    [a.userId, upload.sha256],
  );
  if (previous) return { ok: true, text: previous.extracted_text, via: 'cache', detail: `${previous.stages.find((x) => x.stage === 'extract')?.detail ?? 'earlier extraction'} (reused, same file)` };

  if (upload.kind === 'image' || (upload.kind === 'document' && upload.mime === 'application/pdf')) {
    const cap = upload.kind === 'image' ? 'vision' : 'pdf';
    // Only providers that declare this capability — and are not rate-limited or out of quota right now.
    if (!s.ai.capabilities.has(cap)) return { ok: false, code: 'ocr_unavailable' };
    if (!(await s.aiBudget.tryConsume(a.userId, 'ocr'))) return { ok: false, code: 'ai_budget' };
    const r = await s.ai.structured<{ text: string }>({
      purpose: 'ocr',
      system: OCR_SYSTEM,
      user: [
        upload.kind === 'image' ? { type: 'image', mediaType: upload.mime, base64: data.toString('base64') } : { type: 'document', mediaType: 'application/pdf', base64: data.toString('base64') },
        { type: 'text', text: 'Return the text.' },
      ],
      schema: TEXT_SCHEMA,
      maxTokens: 8000,
      effort: 'low',
    });
    if (!r.ok) return { ok: false, code: 'extraction_failed' };
    return r.data.text.trim() ? { ok: true, text: r.data.text.trim(), via: 'ai-vision', detail: 'ai-vision' } : { ok: false, code: 'empty' };
  }

  // Audio: transcription. Video: transcription of the audio track + optional on-screen text.
  // Preference: the configured transcription adapter; otherwise a provider that accepts the media natively.
  const parts: string[] = [];
  const notes: string[] = [];
  const nativeCap = upload.kind === 'video' ? 'video' : 'audio';
  let onScreenDone = false;
  if (s.transcription.id !== 'unavailable') {
    const r = await s.transcription.transcribe({ data, mime: upload.mime, name: upload.original_name ?? 'media' });
    if (r.ok) {
      parts.push(r.text);
      notes.push('transcription');
    } else notes.push('transcription failed');
  } else if (s.ai.capabilities.has(nativeCap)) {
    if (!(await s.aiBudget.tryConsume(a.userId, 'transcription'))) notes.push('transcription not run (daily AI limit)');
    else {
      const video = upload.kind === 'video';
      const r = await s.ai.structured<{ speech: string; on_screen: string }>({
        purpose: 'transcription',
        system: `Transcribe the speech in this ${video ? 'video' : 'recording'} exactly as spoken, in its original language. Do not summarise, translate, correct or add anything.${video ? ' Separately, list each distinct caption or on-screen sentence once.' : ''} Use an empty string for anything absent.`,
        user: [{ type: nativeCap, mediaType: upload.mime, base64: data.toString('base64') }, { type: 'text', text: 'Return the transcript.' }],
        schema: { type: 'object', additionalProperties: false, properties: { speech: { type: 'string' }, on_screen: { type: 'string' } }, required: ['speech', 'on_screen'] },
        maxTokens: 6000,
        effort: 'low',
      });
      if (!r.ok) notes.push('transcription failed');
      else {
        if (r.data.speech.trim()) {
          parts.push(r.data.speech.trim());
          notes.push('ai-transcription');
        } else notes.push('no speech found');
        if (video) {
          onScreenDone = true;
          if (r.data.on_screen.trim()) {
            parts.push(r.data.on_screen.trim());
            notes.push('on-screen text read from the video');
          } else notes.push('no on-screen text found');
        }
      }
    }
  } else notes.push('transcription unavailable');

  if (upload.kind === 'video' && !onScreenDone) {
    if (s.frames.id === 'unavailable' || !s.ai.capabilities.has('vision')) notes.push('on-screen text not read (frame OCR unavailable)');
    else if (!(await s.aiBudget.tryConsume(a.userId, 'frame-ocr'))) notes.push('on-screen text not read (daily AI limit)');
    else {
      const f = await s.frames.extract(data, { count: 6, everySeconds: 5 });
      if (!f.ok || f.frames.length === 0) notes.push('on-screen text not read (frames unavailable)');
      else {
        const r = await s.ai.structured<{ text: string }>({
          purpose: 'frame-ocr',
          system: `${OCR_SYSTEM} These are frames from one video; list each distinct caption or on-screen sentence once.`,
          user: [...f.frames.map((fr) => ({ type: 'image' as const, mediaType: 'image/jpeg', base64: fr.jpeg.toString('base64') })), { type: 'text', text: 'Return the on-screen text.' }],
          schema: TEXT_SCHEMA,
          maxTokens: 3000,
          effort: 'low',
        });
        if (r.ok && r.data.text.trim()) {
          parts.push(r.data.text.trim());
          notes.push(`on-screen text from ${f.frames.length} frames (first ${f.frames.length * 5}s)`);
        } else notes.push('on-screen text not read (OCR failed)');
      }
    }
  }
  if (!parts.length) {
    const nothingRan = notes.includes('transcription unavailable') && !notes.some((n) => n.startsWith('on-screen text from'));
    return { ok: false, code: nothingRan ? 'transcription_unavailable' : notes.includes('transcription not run (daily AI limit)') ? 'ai_budget' : 'extraction_failed' };
  }
  return { ok: true, text: parts.join('\n'), via: notes[0], detail: notes.join('; ') };
}

/** Rules first; if no rule matches, retrieval may attach RELATED sources but the verdict stays unverified/review. */
async function verifyAll(s: Services, text: string, locale: 'en' | 'ar', userId?: string): Promise<VerifiedClaim[]> {
  const base = extractAndVerify(text);
  let claims = base.claims;
  // Optional: for longer texts the model may find claims the sentence splitter missed — verified by the same rules.
  // Short texts the deterministic splitter already covered don't get a model call.
  const worthIt = text.length > 600 || (base.claims.length === 0 && text.length > 40);
  if (s.ai.capabilities.has('structured_output') && worthIt && userId && (await s.aiBudget.tryConsume(userId, 'claim-extraction'))) {
    const r = await s.ai.structured<{ claims: string[] }>({
      purpose: 'claim-extraction',
      system: 'List the factual statements about Islam in this text, each copied verbatim as a short sentence. Do not judge them. Ignore opinions and greetings.',
      user: compact(text, 20_000),
      schema: { type: 'object', additionalProperties: false, properties: { claims: { type: 'array', items: { type: 'string' } } }, required: ['claims'] },
      maxTokens: 3000,
      effort: 'low',
      routing: { language: locale },
    });
    if (r.ok) {
      const known = new Set(claims.map((c) => c.text));
      for (const ct of r.data.claims.slice(0, 30)) {
        if (!ct || known.has(ct) || !text.includes(ct.slice(0, Math.min(ct.length, 24)))) continue; // verbatim only
        if (!isClaim(ct)) continue;
        claims.push(verifyClaim(ct, `c${claims.length + 1}`));
        known.add(ct);
      }
    }
  }
  claims = claims.slice(0, 40);
  for (const c of claims) {
    if (c.verdict !== 'unverified' && c.verdict !== 'review') continue;
    const [hit] = await retrieve(s, { query: c.text, limit: 1 });
    if (hit && hit.score > 0.45) {
      const k = await getKnowledge(s.db, hit.documentId);
      if (k) {
        c.evidence = k.evidence.slice(0, 2);
        c.explanation = {
          en: `${c.explanation.en} Related sources are shown so a reviewer can check — they do not confirm this exact wording.`,
          ar: `${c.explanation.ar} تُعرض مصادر ذات صلة ليتحقق المراجع — وهي لا تؤكد هذه الصياغة بعينها.`,
        };
      }
    }
  }
  void locale;
  return claims;
}

export async function runAudit(s: Services, a: Access, auditId: string, input: { text?: string; uploadId?: string; locale: 'en' | 'ar' }) {
  try {
    await stage(s, auditId, 'ingest');
    let text = input.text?.trim() ?? '';
    if (input.uploadId) {
      const u = await one<UploadRow>(s.db, 'select id, kind, mime, storage_key, original_name, sha256 from uploads where id = $1 and owner_id = $2 and deleted_at is null', [
        input.uploadId,
        a.userId,
      ]);
      if (!u) throw new AppError('not_found', 'Upload not found.');
      const ex = await extract(s, a, u);
      await stage(s, auditId, 'extract', ex.ok ? ex.detail : ex.code);
      if (!ex.ok) {
        const status = ex.code.endsWith('unavailable') || ex.code === 'ai_budget' ? 'unavailable' : 'failed';
        if (status === 'failed') log.warn('audit.extraction_failed', { audit: auditId, code: ex.code });
        await s.db.query('update content_audits set status = $1, error_code = $2, completed_at = now() where id = $3', [status, ex.code, auditId]);
        s.bus.publish(userChannel(a.userId), { type: 'audit.update', userId: a.userId, auditId, status });
        return;
      }
      text = ex.text;
    } else {
      await stage(s, auditId, 'extract', 'text');
    }
    await s.db.query('update content_audits set extracted_text = $1 where id = $2', [text.slice(0, 50_000), auditId]);
    await stage(s, auditId, 'claims');
    const claims = await verifyAll(s, text, input.locale, a.userId);
    await stage(s, auditId, 'sources');
    await stage(s, auditId, 'verify');
    await s.db.tx(async (q) => {
      for (let i = 0; i < claims.length; i++) {
        const c = claims[i];
        await q.query('insert into content_claims (audit_id, position, text, verdict, explanation, evidence, suggestion) values ($1,$2,$3,$4,$5,$6,$7)', [
          auditId,
          i,
          c.text,
          c.verdict,
          JSON.stringify(c.explanation),
          JSON.stringify(c.evidence),
          c.suggestion ? JSON.stringify(c.suggestion) : null,
        ]);
      }
      await q.query("update content_audits set status = 'completed', completed_at = now() where id = $1", [auditId]);
    });
    await stage(s, auditId, 'done');
    await track(s.db, a.userId, 'audit_completed', { claims: claims.length });
    s.bus.publish(userChannel(a.userId), { type: 'audit.update', userId: a.userId, auditId, status: 'completed' });
  } catch (e) {
    log.error('audit.failed', { audit: auditId, error: e });
    await s.db.query("update content_audits set status = 'failed', error_code = 'internal', completed_at = now() where id = $1", [auditId]);
  }
}

async function auditView(s: Services, userId: string, id: string) {
  const au = await one<{ id: string; tool: 'amanah' | 'nour'; title: string | null; extracted_text: string | null; [k: string]: unknown }>(s.db, 'select id, tool, title, input_kind, upload_id, status, stages, extracted_text, error_code, created_at, completed_at from content_audits where id = $1 and owner_id = $2', [id, userId]);
  if (!au) throw new AppError('not_found', 'Not found.');
  const claims = await s.db.query('select id, position, text, verdict, explanation, evidence, suggestion from content_claims where audit_id = $1 order by position', [id]);
  const counts = { supported: 0, 'needs-context': 0, mismatch: 0, unverified: 0, review: 0 } as Record<string, number>;
  for (const c of claims as { verdict: string }[]) counts[c.verdict]++;
  const sentences = au.extracted_text ? splitSentences(au.extracted_text).length : 0;
  // Verdicts come from curated claim rules; say honestly how many of them a scholar has reviewed.
  const rules = await one<{ total: number; published: number }>(
    s.db,
    "select count(*)::int as total, count(*) filter (where published_version is not null)::int as published from content_blocks where kind = 'claim_rule' and review_status <> 'archived'",
  );
  return { ...au, tool: au.tool, title: au.title, claims, counts, sentences, rules: rules ?? { total: 0, published: 0 } };
}

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.post('/', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('audit', a.userId);
  const b = await body(
    c,
    z
      .object({
        tool: z.enum(['amanah', 'nour']),
        title: z.string().max(120).optional(),
        inputKind: z.enum([...TEXT_KINDS, 'image', 'audio', 'video', 'document']),
        text: z.string().max(50_000).optional(),
        uploadId: Id.optional(),
        locale: z.enum(['en', 'ar']).default('en'),
      })
      .refine((x) => (x.text && x.text.trim()) || x.uploadId, 'Provide text or an upload.'),
  );
  let inputKind: string = b.inputKind;
  if (b.uploadId) {
    const u = await one<{ kind: string }>(s.db, 'select kind from uploads where id = $1 and owner_id = $2 and deleted_at is null', [b.uploadId, a.userId]);
    if (!u) throw new AppError('not_found', 'Upload not found.');
    inputKind = u.kind; // the server decides what the file is, not the client
  }
  const row = await one<{ id: string }>(s.db, 'insert into content_audits (owner_id, tool, title, input_kind, upload_id) values ($1,$2,$3,$4,$5) returning id', [a.userId, b.tool, b.title ?? null, inputKind, b.uploadId ?? null]);
  const job = runAudit(s, a, row!.id, { text: b.text, uploadId: b.uploadId, locale: b.locale });
  if (query(c, z.object({ wait: z.enum(['1']).optional() })).wait) await job;
  return c.json(await auditView(s, a.userId, row!.id), 202);
});

auditRoutes.get('/', async (c) => {
  const a = requireAccess(c);
  return c.json({ audits: await c.get('services').db.query('select id, tool, title, input_kind, status, created_at from content_audits where owner_id = $1 order by created_at desc limit 50', [a.userId]) });
});

auditRoutes.get('/:id', async (c) => {
  const a = requireAccess(c);
  return c.json(await auditView(c.get('services'), a.userId, Id.parse(c.req.param('id'))));
});

/** SUGGEST REVISION → the creator applies it; the change is recorded. */
auditRoutes.post('/:id/claims/:claimId/revision', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const auditId = Id.parse(c.req.param('id'));
  await auditView(s, a.userId, auditId);
  const claim = await one<{ id: string; text: string }>(s.db, 'select id, text from content_claims where id = $1 and audit_id = $2', [Id.parse(c.req.param('claimId')), auditId]);
  if (!claim) throw new AppError('not_found', 'Not found.');
  const { after } = await body(c, z.object({ after: z.string().min(1).max(2000) }));
  await s.db.query('insert into content_revisions (audit_id, claim_id, before_text, after_text, applied_by) values ($1,$2,$3,$4,$5)', [auditId, claim.id, claim.text, after, a.userId]);
  return c.json({ ok: true }, 201);
});

/** SEND TO SCHOLAR REVIEW → a real question in the scholar queue, tagged with its origin. */
auditRoutes.post('/:id/claims/:claimId/review', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('scholar', a.userId);
  const auditId = Id.parse(c.req.param('id'));
  const au = await auditView(s, a.userId, auditId);
  const claim = await one<{ text: string }>(s.db, 'select text from content_claims where id = $1 and audit_id = $2', [Id.parse(c.req.param('claimId')), auditId]);
  if (!claim) throw new AppError('not_found', 'Not found.');
  const q = organizeQuestion(`Is this statement accurate: "${claim.text}"`);
  const row = await one<{ id: string }>(s.db, "insert into scholar_questions (asker_id, question, context, topic, redacted, status, source) values ($1,$2,$3,'other',$4,'queued',$5) returning id", [
    a.userId,
    q.question,
    au.title ? `From ${au.tool.toUpperCase()}: ${au.title}` : `From ${au.tool.toUpperCase()}`,
    q.removedPersonalInfo,
    au.tool,
  ]);
  await questionEvent(s.db, row!.id, 'submitted', { userId: a.userId }, `from ${au.tool}`);
  return c.json({ questionId: row!.id }, 201);
});

/** People can delete their own audit history at any time — the uploaded file goes with it. */
auditRoutes.delete('/:id', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const id = Id.parse(c.req.param('id'));
  await s.db.tx(async (q) => {
    const au = await one<{ upload_id: string | null }>(q, 'delete from content_audits where id = $1 and owner_id = $2 returning upload_id', [id, a.userId]);
    if (au?.upload_id) {
      const u = await one<{ storage_key: string }>(q, 'update uploads set deleted_at = now() where id = $1 and owner_id = $2 and deleted_at is null returning storage_key', [au.upload_id, a.userId]);
      if (u) await queueFileDeletion(q, [u.storage_key], 'audit-deleted');
    }
  });
  await runFileDeletions(s);
  return c.json({ ok: true });
});
