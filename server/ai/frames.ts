/**
 * Video frame extraction for on-screen text (NOUR/AMANAH video audits).
 * Uses a local ffmpeg binary when FFMPEG_PATH is configured; otherwise frame
 * OCR is explicitly unavailable — never simulated.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type FramesResult = { ok: true; frames: { jpeg: Buffer; atSeconds: number }[] } | { ok: false; reason: 'unavailable' | 'error'; detail?: string };

export interface FrameExtractor {
  readonly id: 'ffmpeg' | 'unavailable';
  /** Up to `count` frames, one every `everySeconds`, from the start of the video. */
  extract(video: Buffer, opts: { count: number; everySeconds: number }): Promise<FramesResult>;
}

export const unavailableFrames: FrameExtractor = {
  id: 'unavailable',
  async extract() {
    return { ok: false, reason: 'unavailable' };
  },
};

export function ffmpegFrames(ffmpegPath: string, timeoutMs = 60_000): FrameExtractor {
  return {
    id: 'ffmpeg',
    async extract(video, { count, everySeconds }) {
      const dir = await mkdtemp(join(tmpdir(), 'saja-frames-'));
      try {
        const input = join(dir, 'input');
        await writeFile(input, video, { mode: 0o600 });
        const args = ['-hide_banner', '-loglevel', 'error', '-i', input, '-vf', `fps=1/${everySeconds},scale='min(1280,iw)':-2`, '-frames:v', String(count), join(dir, 'f%02d.jpg')];
        const code = await new Promise<number>((resolve, reject) => {
          const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
          const timer = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
          p.on('error', reject);
          p.on('close', (c) => {
            clearTimeout(timer);
            resolve(c ?? 1);
          });
        });
        if (code !== 0) return { ok: false, reason: 'error', detail: `ffmpeg exit ${code}` };
        const names = (await readdir(dir)).filter((n) => /^f\d+\.jpg$/.test(n)).sort();
        const frames = await Promise.all(names.map(async (n, i) => ({ jpeg: await readFile(join(dir, n)), atSeconds: i * everySeconds })));
        return { ok: true, frames };
      } catch (e) {
        return { ok: false, reason: 'error', detail: (e as Error).message.slice(0, 120) };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
