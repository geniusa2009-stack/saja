/** Server-Sent Events: realtime chat, notifications and status updates for the signed-in person. */
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AppEnv } from '../context.ts';
import { requireAccess } from '../auth/middleware.ts';
import { circleChannel, userChannel, type BusEvent } from '../lib/bus.ts';

export const streamRoutes = new Hono<AppEnv>();

streamRoutes.get('/', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const circles = (await s.db.query<{ circle_id: string }>('select circle_id from circle_members where user_id = $1 and left_at is null', [a.userId])).map((r) => r.circle_id);
  const blocked = new Set((await s.db.query<{ blocked_id: string }>('select blocked_id from user_blocks where blocker_id = $1', [a.userId])).map((r) => r.blocked_id));
  return streamSSE(c, async (stream) => {
    const queue: BusEvent[] = [];
    let wake: (() => void) | null = null;
    const push = (e: BusEvent) => {
      if (e.type === 'chat.message') {
        const m = e.message as { author?: { id?: string } };
        if (m.author?.id && (blocked.has(m.author.id) || m.author.id === a.userId)) return;
      }
      queue.push(e);
      wake?.();
    };
    const offs = [s.bus.subscribe(userChannel(a.userId), push), ...circles.map((id) => s.bus.subscribe(circleChannel(id), push))];
    stream.onAbort(() => offs.forEach((off) => off()));
    await stream.writeSSE({ event: 'ready', data: JSON.stringify({ circles }) });
    while (!stream.aborted) {
      if (!queue.length) {
        await Promise.race([new Promise<void>((r) => (wake = r)), stream.sleep(25_000)]);
        wake = null;
        if (!queue.length) {
          await stream.writeSSE({ event: 'ping', data: '{}' });
          continue;
        }
      }
      const e = queue.shift()!;
      await stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
    }
  });
});
