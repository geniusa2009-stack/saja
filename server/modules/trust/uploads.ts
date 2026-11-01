/**
 * Upload validation: size limit, extension allow-list, and magic-byte sniffing
 * so the declared type must match the actual bytes. Files are stored privately
 * under random keys, never executed and never served publicly.
 */
import { Hono } from 'hono';
import type { AppEnv } from '../../context.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { Id } from '../../lib/http.ts';
import { log } from '../../lib/log.ts';
import { queueFileDeletion, runFileDeletions } from '../lifecycle.ts';
import { sha256 } from '../../lib/crypto.ts';
import { requireAccess } from '../../auth/middleware.ts';

export type UploadKind = 'image' | 'audio' | 'video' | 'document';

const TYPES: Record<string, { kind: UploadKind; ext: string[]; sniff: (b: Buffer) => boolean }> = {
  'image/png': { kind: 'image', ext: ['png'], sniff: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  'image/jpeg': { kind: 'image', ext: ['jpg', 'jpeg'], sniff: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { kind: 'image', ext: ['webp'], sniff: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  'audio/mpeg': { kind: 'audio', ext: ['mp3'], sniff: (b) => b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  'audio/wav': { kind: 'audio', ext: ['wav'], sniff: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE' },
  'audio/mp4': { kind: 'audio', ext: ['m4a'], sniff: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
  'audio/ogg': { kind: 'audio', ext: ['ogg', 'oga'], sniff: (b) => b.toString('ascii', 0, 4) === 'OggS' },
  'video/mp4': { kind: 'video', ext: ['mp4', 'm4v', 'mov'], sniff: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
  'video/webm': { kind: 'video', ext: ['webm'], sniff: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  'application/pdf': { kind: 'document', ext: ['pdf'], sniff: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
  'text/plain': { kind: 'document', ext: ['txt', 'md'], sniff: (b) => !b.includes(0) && Buffer.from(b.toString('utf8'), 'utf8').equals(b) },
};

export function validateUpload(name: string, declared: string, data: Buffer, maxBytes: number): { kind: UploadKind; mime: string } {
  if (data.length === 0) throw new AppError('bad_request', 'The file is empty.');
  if (data.length > maxBytes) throw new AppError('payload_too_large', `Files can be up to ${Math.round(maxBytes / 1_048_576)} MB.`);
  const mime = declared.split(';')[0].trim().toLowerCase();
  const t = TYPES[mime];
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (!t || !t.ext.includes(ext)) throw new AppError('unsupported_media', 'This file type isn’t supported.');
  if (!t.sniff(data.subarray(0, Math.min(data.length, 4096)))) throw new AppError('unsupported_media', 'The file’s contents don’t match its type.');
  return { kind: t.kind, mime };
}

export const uploadRoutes = new Hono<AppEnv>();

uploadRoutes.post('/', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('upload', a.userId);
  const max = s.config.MAX_UPLOAD_MB * 1_048_576;
  const len = Number(c.req.header('content-length') ?? 0);
  if (len > max + 64_000) throw new AppError('payload_too_large', `Files can be up to ${s.config.MAX_UPLOAD_MB} MB.`);
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new AppError('bad_request', 'Attach a file.');
  const data = Buffer.from(await file.arrayBuffer());
  let kind: UploadKind;
  let mime: string;
  try {
    ({ kind, mime } = validateUpload(file.name, file.type, data, max));
  } catch (e) {
    log.warn('upload.rejected', { declared: file.type, size: data.length, code: e instanceof AppError ? e.code : 'error' });
    throw e;
  }
  const key = await s.storage.put(data);
  const row = await one<{ id: string }>(s.db, 'insert into uploads (owner_id, kind, mime, size_bytes, sha256, storage_key, original_name) values ($1,$2,$3,$4,$5,$6,$7) returning id', [
    a.userId,
    kind,
    mime,
    data.length,
    sha256(data),
    key,
    // Original file names can carry personal details and aren't needed: keep only the type.
    `upload.${(file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'}`,
  ]);
  return c.json({ id: row!.id, kind, mime, size: data.length }, 201);
});

uploadRoutes.delete('/:id', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.db.tx(async (q) => {
    const u = await one<{ storage_key: string }>(q, 'update uploads set deleted_at = now() where id = $1 and owner_id = $2 and deleted_at is null returning storage_key', [Id.parse(c.req.param('id')), a.userId]);
    if (u) await queueFileDeletion(q, [u.storage_key], 'upload-deleted');
  });
  await runFileDeletions(s);
  return c.json({ ok: true });
});
