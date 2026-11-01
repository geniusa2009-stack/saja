/**
 * Realtime event bus, fanned out to clients over SSE.
 *
 * `EventBus` is the only thing product code depends on. The default is
 * in-process (single instance). For several instances, implement the same two
 * methods on Postgres LISTEN/NOTIFY, Redis pub/sub or a managed realtime service.
 */
import { EventEmitter } from 'node:events';

export type BusEvent =
  | { type: 'chat.message'; circleId: string; message: unknown }
  | { type: 'chat.update'; circleId: string; message: unknown }
  | { type: 'notification'; userId: string; notification: unknown }
  | { type: 'scholar.update'; userId: string; questionId: string; status: string }
  | { type: 'audit.update'; userId: string; auditId: string; status: string }
  | { type: 'dm.message'; userId: string; threadId: string; message: unknown }
  | { type: 'dm.thread'; userId: string; threadId: string; status: string }
  | { type: 'usage.update'; userId: string; usage: unknown };

export interface EventBus {
  publish(channel: string, event: BusEvent): void;
  /** Returns an unsubscribe function. */
  subscribe(channel: string, fn: (e: BusEvent) => void): () => void;
}

export class InProcessBus implements EventBus {
  private e = new EventEmitter();
  constructor() {
    this.e.setMaxListeners(0);
  }
  publish(channel: string, event: BusEvent) {
    this.e.emit(channel, event);
  }
  subscribe(channel: string, fn: (e: BusEvent) => void) {
    this.e.on(channel, fn);
    return () => this.e.off(channel, fn);
  }
}
export const userChannel = (id: string) => `user:${id}`;
export const circleChannel = (id: string) => `circle:${id}`;
