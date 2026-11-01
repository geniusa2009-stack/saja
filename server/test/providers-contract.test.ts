// @vitest-environment node
/**
 * Contract tests for the other external services, without their real endpoints:
 *  - Voyage embeddings: request shape, ordering, failures — and re-indexing when
 *    the embedding provider changes (otherwise search would silently go empty).
 *  - Transcription: a real multipart HTTP request to a local Whisper-compatible
 *    server, through a full audio audit; a failing service is reported, not guessed.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createTestServer, traveller } from './harness.ts';
import { lexicalEmbed, voyageEmbeddings } from '../ai/embeddings.ts';
import { remoteTranscription } from '../ai/transcription.ts';
import { reindexStaleChunks } from '../modules/knowledge/reindex.ts';
import type { EmbeddingProvider } from '../ai/types.ts';

describe('Voyage embeddings contract', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => (globalThis.fetch = realFetch));

  it('sends model, input type and dimension with a bearer key; returns vectors in input order', async () => {
    let seen: { url: string; auth: string | null; body: { input: string[]; model: string; input_type: string; output_dimension: number } } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get('authorization'), body: JSON.parse(String(init.body)) };
      // The API may return items out of order; `index` says which input each belongs to.
      return new Response(JSON.stringify({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }], model: 'voyage-3.5', usage: { total_tokens: 4 } }), { status: 200 });
    }) as typeof fetch;
    const v = await voyageEmbeddings('pa-test', 'voyage-3.5').embed(['first', 'second'], 'query');
    expect(v).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(seen!.url).toBe('https://api.voyageai.com/v1/embeddings');
    expect(seen!.auth).toBe('Bearer pa-test');
    expect(seen!.body).toEqual({ input: ['first', 'second'], model: 'voyage-3.5', input_type: 'query', output_dimension: 256 });
  });

  it('a failed call throws (so retrieval reports "can’t check sources" instead of answering)', async () => {
    globalThis.fetch = (async () => new Response('{"detail":"Unauthorized"}', { status: 401 })) as unknown as typeof fetch;
    await expect(voyageEmbeddings('bad', 'voyage-3.5').embed(['x'], 'query')).rejects.toThrow(/401/);
  });
});

describe('switching embedding provider re-indexes the library', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it('re-embeds every chunk once; a failing provider is visible in /system/health', async () => {
    // Stand-in for a new provider (e.g. Voyage): same vectors, different model id.
    const next: EmbeddingProvider = { id: 'voyage:test:256', dimensions: 256, embed: async (texts) => texts.map(lexicalEmbed) };
    const broken: EmbeddingProvider = { id: 'voyage:down:256', dimensions: 256, embed: async () => Promise.reject(new Error('503')) };
    const [{ n: total }] = await t.services.db.query<{ n: number }>('select count(*)::int as n from knowledge_chunks');

    t.services.embeddings = broken;
    await reindexStaleChunks(t.services); // logs the failure, doesn't crash start-up
    const down = (await t.client().get('/system/health')).data;
    expect(down).toMatchObject({ ok: false, staleEmbeddings: total });

    t.services.embeddings = next;
    expect(await reindexStaleChunks(t.services)).toBe(total);
    expect(await reindexStaleChunks(t.services)).toBe(0); // idempotent
    expect((await t.client().get('/system/health')).data).toMatchObject({ ok: true, staleEmbeddings: 0 });
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text: 'How do I perform wudu?', ctx: { locale: 'en' } })).data;
    expect(r).toMatchObject({ status: 'supported', knowledgeId: 'k-wudu' });
  });
});

describe('transcription over real HTTP (local Whisper-compatible server)', () => {
  let server: Server;
  let url = '';
  let mode: 'ok' | 'fail' = 'ok';
  const got: { auth: string | undefined; type: string | undefined; body: string }[] = [];
  let t: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (d: Buffer) => chunks.push(d));
      req.on('end', () => {
        got.push({ auth: req.headers.authorization, type: req.headers['content-type'], body: Buffer.concat(chunks).toString('latin1') });
        if (mode === 'fail') return void res.writeHead(500).end('{"error":"boom"}');
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ text: 'Fasting in Ramadan is one of the five pillars of Islam.' }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/audio/transcriptions`;
    t = await createTestServer({ transcription: remoteTranscription(url, 'tr-test-key', 'whisper-1') });
  }, 60_000);
  afterAll(async () => {
    server.close();
    await t.close();
  });

  const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  it('sends the audio as multipart with the model and key, and audits the transcript', async () => {
    const c = await traveller(t.client());
    const up = (await c.upload('lecture.mp3', 'audio/mpeg', MP3)).data;
    const audit = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'audio', uploadId: up.id })).data;
    expect(audit.status).toBe('completed');
    expect(audit.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toMatch(/transcription/);
    expect(audit.claims.some((cl: { verdict: string }) => cl.verdict === 'supported')).toBe(true);
    const [req] = got;
    expect(req.auth).toBe('Bearer tr-test-key');
    expect(req.type).toMatch(/^multipart\/form-data; boundary=/);
    expect(req.body).toContain('name="model"');
    expect(req.body).toContain('whisper-1');
    expect(req.body).toMatch(/name="file"; filename="upload\.mp3"/); // the person's file name is never sent
  });

  it('a failing transcription service gives an honest failure, never an invented transcript', async () => {
    mode = 'fail';
    const c = await traveller(t.client());
    const up = (await c.upload('other.mp3', 'audio/mpeg', new Uint8Array([...MP3, 99]))).data;
    const audit = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'audio', uploadId: up.id })).data;
    expect(['failed', 'unavailable']).toContain(audit.status);
    expect(audit.claims).toEqual([]);
    expect(audit.extracted_text).toBeNull();
  });
});

describe('password-reset email over real SMTP (local sink)', () => {
  let sink: import('node:net').Server;
  let port = 0;
  let accept = true;
  const mails: { from: string; to: string[]; data: string }[] = [];

  beforeAll(async () => {
    const net = await import('node:net');
    // A minimal SMTP server: enough of RFC 5321 for nodemailer to deliver a message.
    sink = net.createServer((sock) => {
      let from = '';
      const to: string[] = [];
      let inData = false;
      let data = '';
      let buf = '';
      sock.write('220 sink ESMTP\r\n');
      sock.on('data', (d) => {
        buf += d.toString('utf8');
        let i: number;
        while ((i = buf.indexOf('\r\n')) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              mails.push({ from, to: [...to], data });
              sock.write(accept ? '250 queued\r\n' : '554 rejected\r\n');
            } else data += `${line}\n`;
            continue;
          }
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-sink\r\n250 SIZE 10485760\r\n');
          else if (cmd === 'MAIL') {
            from = line;
            sock.write('250 ok\r\n');
          } else if (cmd === 'RCPT') {
            to.push(line);
            sock.write('250 ok\r\n');
          } else if (cmd === 'DATA') {
            inData = true;
            sock.write('354 go ahead\r\n');
          }
          else if (cmd === 'QUIT') sock.end('221 bye\r\n');
          else sock.write('250 ok\r\n');
        }
      });
    });
    await new Promise<void>((r) => sink.listen(0, '127.0.0.1', r));
    port = (sink.address() as AddressInfo).port;
  });
  afterAll(() => sink.close());

  it('delivers the reset link by SMTP, keeps no link in the database, and failures don’t reveal accounts', async () => {
    const { loadConfig } = await import('../config.ts');
    const { createServices } = await import('../services.ts');
    const { createApp } = await import('../app.ts');
    const { Client, account } = await import('./harness.ts');
    const config = loadConfig({ SAJA_ENV: 'test', TRUST_PROXY: 'true', SMTP_URL: `smtp://127.0.0.1:${port}?ignoreTLS=true`, MAIL_FROM: 'SAJA <no-reply@example.test>' } as NodeJS.ProcessEnv);
    const services = await createServices(config);
    const app = createApp(services);
    try {
      await account(new Client(app), 'adult', 'smtp-user@example.com');
      const c = new Client(app);
      const r = await c.post('/auth/reset/request', { email: 'smtp-user@example.com' });
      expect(r.data).toEqual({ ok: true, delivery: 'smtp' });
      for (let i = 0; i < 100 && !mails.length; i++) await new Promise((res) => setTimeout(res, 20));
      expect(mails).toHaveLength(1);
      expect(mails[0].from).toContain('no-reply@example.test');
      expect(mails[0].to[0]).toContain('smtp-user@example.com');
      expect(mails[0].data).toMatch(/Subject: Reset your SAJA password/);
      expect(mails[0].data).toMatch(/account\/reset\?token=/);
      const [row] = await services.db.query<{ body: string; provider: string }>("select body, provider from email_outbox where to_email = 'smtp-user@example.com'");
      expect(row).toEqual({ body: '[sent via smtp]', provider: 'smtp' }); // the link itself is not stored

      // The mail server refuses: the response is identical to an unknown address.
      accept = false;
      const known = await c.post('/auth/reset/request', { email: 'smtp-user@example.com' });
      const unknown = await c.post('/auth/reset/request', { email: 'nobody-here@example.com' });
      expect(known).toEqual(unknown);
      expect(known.status).toBe(200);
    } finally {
      accept = true;
      await new Promise((res) => setTimeout(res, 100));
      await services.db.close();
    }
  });
});
