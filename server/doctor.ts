/**
 * Service check for operators: `npm run saja -- doctor`.
 *
 * For every external service it reports exactly one of:
 *   PASS           — a real call to the configured service succeeded just now
 *   FAIL           — it is configured, and the real call failed
 *   NOT CONFIGURED — no credentials; SAJA uses its honest fallback
 *   NOT TESTED     — configured, but this check can't prove it end to end (said why)
 * It never reports PASS without a live call, and never sends personal data.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Config } from './config.ts';
import type { AICapability, ContentBlock, ProviderId } from './ai/types.ts';
import { PROVIDER_CAPABILITIES } from './ai/models.ts';
import { createEmbeddings, createProvider } from './ai/providers.ts';
import { EMBED_DIM } from './ai/embeddings.ts';
import { redact } from './ai/wire.ts';

export type CheckStatus = 'PASS' | 'FAIL' | 'NOT CONFIGURED' | 'NOT TESTED';
export interface CheckResult {
  service: string;
  status: CheckStatus;
  detail: string;
  group: 'ai-provider' | 'embeddings' | 'feature' | 'infrastructure';
  /** AI provider rows only. */
  provider?: { id: ProviderId; label: string; configured: boolean; model: string; capabilities: AICapability[]; check: string };
}
export interface DoctorDeps {
  fetch?: typeof fetch;
  run?: (cmd: string, args: string[]) => Promise<{ stdout: string }>;
  smtpVerify?: (url: string) => Promise<void>;
  postgres?: (url: string) => Promise<{ vector: string | null }>;
}

// 1×1 transparent PNG: proves the vision input is accepted (not OCR accuracy).
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** 0.25 s of silence as a 16-bit mono WAV. */
function silentWavBuffer(): Buffer {
  const rate = 8000;
  const samples = rate / 4;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}
const silentWav = () => new Blob([new Uint8Array(silentWavBuffer())], { type: 'audio/wav' });

const errorText = (e: unknown) => redact((e instanceof Error ? e.message : String(e)).replace(/(sk|pa|key)[-_][\w-]{6,}/gi, '[redacted]')).slice(0, 160);

async function timed<T>(fn: () => Promise<T>) {
  const t = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t };
}

export async function runDoctor(config: Config, deps: DoctorDeps = {}): Promise<CheckResult[]> {
  const f = deps.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const results: CheckResult[] = [];
  const add = (service: string, status: CheckStatus, detail: string, group: CheckResult['group'] = 'infrastructure', provider?: CheckResult['provider']) =>
    results.push({ service, status, detail, group, ...(provider ? { provider } : {}) });

  /* ── AI providers, in routing order: each configured one gets real minimal requests ── */
  const schema = { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean' } }, required: ['ok'] };
  const passed: Record<'chat' | 'vision' | 'audio', ProviderId[]> = { chat: [], vision: [], audio: [] };
  const failed: Record<'chat' | 'vision' | 'audio', ProviderId[]> = { chat: [], vision: [], audio: [] };
  const usable = (id: ProviderId) => config.ai.providers[id].usable;
  for (const id of config.ai.order) {
    const spec = PROVIDER_CAPABILITIES[id];
    const p = config.ai.providers[id];
    const info = (check: string) => ({ id, label: spec.label, configured: p.configured, model: p.model, capabilities: p.capabilities, check });
    if (!p.configured) {
      add(spec.label, 'NOT CONFIGURED', `${spec.keyVar} unset.`, 'ai-provider', info('configured'));
      continue;
    }
    const provider = createProvider(config, id, { fetch: f, timeoutMs: 30_000 })!;
    const note = !p.usable ? (p.paid ? ' Not used for routing: paid, and SAJA_AI_ALLOW_PAID is not true.' : '') : '';
    const probe = async (kind: 'chat' | 'vision' | 'audio', user: string | ContentBlock[]) => {
      const r = await timed(() => provider.structured<{ ok: boolean }>({ purpose: 'health-check', system: 'This is a connectivity check. Reply with {"ok": true}.', user, schema, maxTokens: 64, effort: 'low' }));
      if (r.value.ok) {
        passed[kind].push(id);
        add(`${spec.label} · ${kind}`, 'PASS', `${r.value.model} returned schema-valid JSON in ${r.ms} ms${kind === 'chat' ? '' : ` (${kind} input accepted; accuracy is not measured)`}.${note}`, 'ai-provider', info(kind));
      } else {
        failed[kind].push(id);
        const why = r.value.reason === 'auth' ? ' Likely cause: the key is wrong, revoked or lacks access.' : r.value.reason === 'rate_limited' ? ' Likely cause: free-tier rate limit; try again later.' : r.value.reason === 'quota' ? ' Likely cause: allowance or credits used up.' : r.value.detail?.includes('404') ? ` Likely cause: model "${p.model}" not found — set ${spec.modelVar}.` : '';
        add(`${spec.label} · ${kind}`, 'FAIL', `${r.value.reason}${r.value.detail ? ` (${redact(r.value.detail)})` : ''} — model ${p.model}.${why}${note}`, 'ai-provider', info(kind));
      }
    };
    await probe('chat', 'Health check.');
    if (p.capabilities.includes('vision')) await probe('vision', [{ type: 'image', mediaType: 'image/png', base64: PNG_1PX }, { type: 'text', text: 'Health check.' }]);
    if (p.capabilities.includes('audio')) await probe('audio', [{ type: 'audio', mediaType: 'audio/wav', base64: silentWavBuffer().toString('base64') }, { type: 'text', text: 'Health check.' }]);
    const untested = p.capabilities.filter((c) => c === 'pdf' || c === 'video');
    if (untested.length) add(`${spec.label} · ${untested.join(', ')}`, 'NOT TESTED', `Declared for ${p.model}; not exercised by this check (it would need a real document/video). Tried on first use; failures fall back honestly.`, 'ai-provider', info(untested.join(',')));
  }

  /* ── Embeddings (RAG) ── */
  const emb = config.ai.embeddings;
  if (emb.provider === 'local') add('Embeddings (retrieval)', 'NOT CONFIGURED', 'GEMINI_API_KEY (or VOYAGE_API_KEY) unset: local keyword-level embeddings are used.', 'embeddings');
  else {
    try {
      const r = await timed(() => createEmbeddings(config, { fetch: f }).embed(['wudu before prayer', 'الوضوء قبل الصلاة'], 'query'));
      const ok = r.value.length === 2 && r.value.every((x) => x.length === EMBED_DIM);
      add('Embeddings (retrieval)', ok ? 'PASS' : 'FAIL', ok ? `${emb.provider} ${emb.model}: 2 × ${EMBED_DIM}-dim vectors (EN + AR) in ${r.ms} ms. The library re-indexes automatically at start-up when the model changes.` : 'Unexpected vector shape.', 'embeddings');
    } catch (e) {
      add('Embeddings (retrieval)', 'FAIL', errorText(e), 'embeddings');
    }
  }

  /* ── What the features get, given the providers above ── */
  const routeOf = (kind: 'chat' | 'vision' | 'audio') => config.ai.order.filter((id) => usable(id) && passed[kind].includes(id)).map((id) => PROVIDER_CAPABILITIES[id].label);
  const anyUsable = (cap: AICapability) => config.ai.order.some((id) => usable(id) && config.ai.providers[id].capabilities.includes(cap));
  const chatRoute = routeOf('chat');
  if (!config.ai.order.some(usable)) add('Siraj answers', 'NOT CONFIGURED', `No usable AI provider (set GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY or MISTRAL_API_KEY${config.ai.providers.anthropic.configured ? '; ANTHROPIC_API_KEY also needs SAJA_AI_ALLOW_PAID=true' : ''}): Siraj answers from curated text (offline mode).`, 'feature');
  else if (chatRoute.length) add('Siraj answers', 'PASS', `Route: ${chatRoute.join(' → ')} → curated offline answers.`, 'feature');
  else add('Siraj answers', 'FAIL', 'Every usable provider failed its live check: Siraj answers from curated text until one works.', 'feature');

  const visionRoute = routeOf('vision');
  if (!anyUsable('vision')) add('OCR (images/PDFs)', 'NOT CONFIGURED', 'No usable provider with vision (GEMINI_API_KEY or MISTRAL_API_KEY): image/PDF checks report "unavailable".', 'feature');
  else if (visionRoute.length) add('OCR (images/PDFs)', 'PASS', `Image input accepted by ${visionRoute.join(' → ')}. Reading accuracy is not measured by this check.`, 'feature');
  else add('OCR (images/PDFs)', 'FAIL', 'Every usable vision provider failed its live image check.', 'feature');

  // Transcription: a Whisper-compatible adapter if configured, else a provider that accepts audio natively.
  if (config.TRANSCRIPTION_API_URL && config.TRANSCRIPTION_API_KEY) {
    try {
      const form = new FormData();
      form.append('model', config.TRANSCRIPTION_MODEL);
      form.append('file', silentWav(), 'health-check.wav');
      const r = await timed(() => f(config.TRANSCRIPTION_API_URL!, { method: 'POST', headers: { authorization: `Bearer ${config.TRANSCRIPTION_API_KEY}` }, body: form, signal: AbortSignal.timeout(30_000) }));
      add('Transcription (audio/video)', r.value.ok ? 'PASS' : 'FAIL', r.value.ok ? `Adapter accepted 0.25 s of audio in ${r.ms} ms (accuracy not measured).` : `HTTP ${r.value.status}.`, 'feature');
    } catch (e) {
      add('Transcription (audio/video)', 'FAIL', errorText(e), 'feature');
    }
  } else if (anyUsable('audio')) {
    const audioRoute = routeOf('audio');
    if (audioRoute.length) add('Transcription (audio/video)', 'PASS', `Provider-native audio via ${audioRoute.join(' → ')} (0.25 s of silence accepted; accuracy not measured).`, 'feature');
    else add('Transcription (audio/video)', 'FAIL', 'The usable audio-capable provider failed its live audio check.', 'feature');
  } else add('Transcription (audio/video)', 'NOT CONFIGURED', 'Set TRANSCRIPTION_API_URL and TRANSCRIPTION_API_KEY, or GEMINI_API_KEY (native audio): audio and video checks report "unavailable".', 'feature');

  // Video on-screen text: provider-native video, or local ffmpeg + a vision provider.
  const nativeVideo = anyUsable('video');
  if (!config.FFMPEG_PATH)
    add(
      'Video frames (ffmpeg)',
      'NOT CONFIGURED',
      nativeVideo ? 'FFMPEG_PATH unset — not needed while a provider reads video natively (that path is NOT TESTED here: it needs a real video).' : 'FFMPEG_PATH unset: videos are checked from their transcript only, and results say so.',
      'feature',
    );
  else {
    try {
      const run = deps.run ?? ((cmd: string, args: string[]) => promisify(execFile)(cmd, args, { timeout: 10_000 }));
      const { stdout } = await run(config.FFMPEG_PATH, ['-version']);
      const line = stdout.split('\n')[0];
      if (visionRoute.length) add('Video frames (ffmpeg)', 'PASS', `${line}; frames are read by ${visionRoute[0]}. Frame extraction on a real video is not run by this check.`, 'feature');
      else add('Video frames (ffmpeg)', 'NOT TESTED', `${line}, but reading frames also needs a working vision provider.`, 'feature');
    } catch (e) {
      add('Video frames (ffmpeg)', 'FAIL', errorText(e), 'feature');
    }
  }

  // Web Push: the keys can be validated here; delivery needs a subscribed browser.
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) add('Push notifications', 'NOT CONFIGURED', 'VAPID keys unset: in-app notifications only.');
  else {
    try {
      const webpush = (await import('web-push')).default;
      webpush.getVapidHeaders('https://fcm.googleapis.com', config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY, 'aes128gcm');
      add('Push notifications', 'NOT TESTED', 'VAPID keys are valid and sign requests. Delivery to a real push service needs a subscribed browser: enable reminders in the app and check an actual device.');
    } catch (e) {
      add('Push notifications', 'FAIL', `VAPID keys invalid: ${errorText(e)}`);
    }
  }

  // SMTP: a real connection + authentication, without sending mail.
  if (!config.SMTP_URL) add('Email (SMTP)', 'NOT CONFIGURED', 'SMTP_URL unset: reset emails go to the email_outbox table, not to people.');
  else {
    try {
      const verify =
        deps.smtpVerify ??
        (async (url: string) => {
          const nodemailer = await import('nodemailer');
          await nodemailer.createTransport(url).verify();
        });
      const r = await timed(() => verify(config.SMTP_URL!));
      add('Email (SMTP)', 'PASS', `Connected and authenticated in ${r.ms} ms (no mail sent).`);
    } catch (e) {
      add('Email (SMTP)', 'FAIL', errorText(e));
    }
  }

  // Managed Postgres with pgvector.
  if (!config.DATABASE_URL) add('Managed Postgres', 'NOT CONFIGURED', 'DATABASE_URL unset: embedded PGlite on local disk (single instance, development/demo only).');
  else {
    try {
      const probe =
        deps.postgres ??
        (async (url: string) => {
          const pg = (await import('pg')).default;
          const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
          await client.connect();
          try {
            const r = await client.query<{ extversion: string }>("select extversion from pg_extension where extname = 'vector'");
            return { vector: r.rows[0]?.extversion ?? null };
          } finally {
            await client.end();
          }
        });
      const r = await timed(() => probe(config.DATABASE_URL!));
      if (r.value.vector) add('Managed Postgres', 'PASS', `Connected in ${r.ms} ms; pgvector ${r.value.vector} installed.`);
      else add('Managed Postgres', 'FAIL', 'Connected, but the pgvector extension is not installed (run `create extension vector` or let the first migration do it).');
    } catch (e) {
      add('Managed Postgres', 'FAIL', errorText(e));
    }
  }
  return results;
}

/** Human-readable report for the CLI. Never contains keys (none are in the results). */
export function formatDoctor(results: CheckResult[], config: Config): string {
  const lines: string[] = [];
  const order = config.ai.order.map((id) => `${PROVIDER_CAPABILITIES[id].label}${config.ai.providers[id].paid ? ' (paid)' : ''}`).join(' → ');
  lines.push(`AI providers — routing order: ${order} → curated offline answers`);
  lines.push(`  paid providers ${config.ai.allowPaid ? 'ALLOWED' : 'not used'} (SAJA_AI_ALLOW_PAID) · sensitive tasks may use: ${config.ai.sensitive.join(', ') || 'none'}`);
  for (const id of config.ai.order) {
    const rows = results.filter((r) => r.provider?.id === id);
    const p = config.ai.providers[id];
    lines.push('', PROVIDER_CAPABILITIES[id].label);
    lines.push(`  configured:   ${p.configured ? 'YES' : 'NO'}`);
    lines.push(`  model:        ${p.model}${p.configured ? '' : ' (default)'}`);
    lines.push(`  capabilities: ${p.capabilities.join(', ')}`);
    for (const r of rows) {
      const label = r.provider!.check === 'configured' ? 'live test' : r.provider!.check;
      lines.push(`  ${`${label}:`.padEnd(14)}${r.status}${r.detail ? ` — ${r.detail}` : ''}`);
    }
  }
  const section = (title: string, group: CheckResult['group']) => {
    const rows = results.filter((r) => r.group === group);
    if (!rows.length) return;
    const w = Math.max(...rows.map((r) => r.service.length));
    lines.push('', title);
    for (const r of rows) lines.push(`  ${r.service.padEnd(w)}  ${r.status.padEnd(14)}  ${r.detail}`);
  };
  section('Embeddings', 'embeddings');
  section('Features', 'feature');
  section('Infrastructure', 'infrastructure');
  const count = (st: CheckStatus) => results.filter((r) => r.status === st).length;
  lines.push('', `Summary: ${count('PASS')} PASS · ${count('FAIL')} FAIL · ${count('NOT CONFIGURED')} NOT CONFIGURED · ${count('NOT TESTED')} NOT TESTED`);
  return lines.join('\n');
}
