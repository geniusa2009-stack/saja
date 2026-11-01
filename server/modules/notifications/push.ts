/** Web Push delivery (VAPID). Disabled — and reported as disabled — without keys. */
import type { Agent } from 'node:https';
import type { Config } from '../../config.ts';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}
export interface Pusher {
  readonly mode: 'web-push' | 'disabled';
  readonly publicKey: string | null;
  send(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: PushPayload): Promise<'sent' | 'gone' | 'failed'>;
}

/** `agent` lets tests (or a proxy setup) choose the HTTPS agent used to reach push services. */
export function createPusher(config: Config, opts: { agent?: Agent } = {}): Pusher {
  if (config.modes.push !== 'web-push') {
    return { mode: 'disabled', publicKey: null, send: async () => 'failed' };
  }
  let configured = false;
  return {
    mode: 'web-push',
    publicKey: config.VAPID_PUBLIC_KEY!,
    async send(sub, payload) {
      const webpush = (await import('web-push')).default;
      if (!configured) {
        webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY!, config.VAPID_PRIVATE_KEY!);
        configured = true;
      }
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, ...(opts.agent ? { agent: opts.agent } : {}) });
        return 'sent';
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        return status === 404 || status === 410 ? 'gone' : 'failed';
      }
    },
  };
}
