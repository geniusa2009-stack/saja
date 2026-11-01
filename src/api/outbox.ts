/**
 * Safe offline queue. Only idempotent, low-risk writes are queued (prayer marks,
 * plan items, goals, world location) — last write wins per key. Nothing that
 * reaches another person (messages, questions, reports) is ever queued: those
 * are refused offline, honestly. The queue is flushed after reconnecting.
 */
import { api, ApiError } from './client';

type Op = { key: string; method: 'PUT' | 'POST' | 'DELETE'; path: string; body?: unknown; at: number };
const STORE = 'saja:outbox:v1';

function read(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '[]') as Op[];
  } catch {
    return [];
  }
}
function write(ops: Op[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(ops.slice(-200)));
  } catch {
    /* storage unavailable: the write stays local only */
  }
}

export function enqueue(op: Omit<Op, 'at'>) {
  const ops = read().filter((o) => o.key !== op.key);
  ops.push({ ...op, at: Date.now() });
  write(ops);
}

export const pendingCount = () => read().length;
export const clearOutbox = () => write([]);

const call = (op: Op) => (op.method === 'PUT' ? api.put(op.path, op.body) : op.method === 'POST' ? api.post(op.path, op.body) : api.del(op.path));

/** Sends queued writes in order. Stops at the first network failure; drops writes the server refuses. */
export async function flushOutbox(): Promise<{ sent: number; dropped: number }> {
  let sent = 0;
  let dropped = 0;
  const today = new Date().toDateString();
  for (const op of read()) {
    // Day-specific marks only make sense for the day they were made on: the server records "today".
    if (/^(prayer|item):/.test(op.key) && new Date(op.at).toDateString() !== today) {
      dropped++;
      write(read().filter((o) => o.key !== op.key || o.at !== op.at));
      continue;
    }
    try {
      await call(op);
      sent++;
    } catch (e) {
      if (e instanceof ApiError && e.offline) break;
      dropped++; // refused (e.g. no longer valid): never retried forever
    }
    write(read().filter((o) => o.key !== op.key || o.at !== op.at));
  }
  return { sent, dropped };
}

/** Try now; if the server can't be reached, queue it (only for the safe kinds of write above). */
export async function sendOrQueue(op: Omit<Op, 'at'>, online: boolean) {
  if (!online) return enqueue(op);
  try {
    await call({ ...op, at: Date.now() });
  } catch (e) {
    if (e instanceof ApiError && e.offline) enqueue(op);
  }
}
