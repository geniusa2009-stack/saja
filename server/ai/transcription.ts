/**
 * Speech-to-text adapter for a Whisper-compatible `/audio/transcriptions`
 * endpoint (configure TRANSCRIPTION_API_URL / _KEY / _MODEL). Without it,
 * transcription is explicitly unavailable — never simulated.
 */
import type { TranscriptionProvider } from './types.ts';

export const unavailableTranscription: TranscriptionProvider = {
  id: 'unavailable',
  async transcribe() {
    return { ok: false, reason: 'unavailable' };
  },
};

export function remoteTranscription(url: string, key: string, model: string): TranscriptionProvider {
  return {
    id: 'remote',
    async transcribe(file) {
      const form = new FormData();
      form.append('model', model);
      form.append('file', new Blob([new Uint8Array(file.data)], { type: file.mime }), file.name);
      try {
        const res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(120_000) });
        if (!res.ok) return { ok: false, reason: 'error', detail: String(res.status) };
        const json = (await res.json()) as { text?: string };
        return json.text ? { ok: true, text: json.text } : { ok: false, reason: 'error', detail: 'empty' };
      } catch (e) {
        return { ok: false, reason: 'error', detail: (e as Error).name };
      }
    },
  };
}
