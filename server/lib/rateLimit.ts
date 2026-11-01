/**
 * Token-bucket rate limiting keyed by user (or IP for anonymous calls).
 * In-memory: correct for a single instance; swap for Redis when scaling out.
 */
import { AppError } from './errors.ts';

export interface Limit {
  capacity: number;
  refillPerMinute: number;
}

export const LIMITS = {
  auth: { capacity: 10, refillPerMinute: 5 },
  ai: { capacity: 12, refillPerMinute: 4 },
  chat: { capacity: 20, refillPerMinute: 12 },
  scholar: { capacity: 5, refillPerMinute: 1 },
  audit: { capacity: 10, refillPerMinute: 3 },
  upload: { capacity: 6, refillPerMinute: 2 },
  search: { capacity: 60, refillPerMinute: 60 },
  write: { capacity: 120, refillPerMinute: 120 },
} satisfies Record<string, Limit>;
export type LimitName = keyof typeof LIMITS;

/**
 * Rate limiting interface. Product code only ever calls `await limiter.take(...)`,
 * so a shared store (Redis, a database table, an API gateway) can replace the
 * in-memory buckets for multi-instance deployments without touching routes.
 */
export interface RateLimiter {
  /** Spends `cost` tokens from the named bucket for `key`; throws AppError('rate_limited') when empty. */
  take(name: LimitName, key: string, cost?: number): Promise<void>;
}

/** Single-process token buckets (the default). */
export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  constructor(private now: () => number = Date.now) {}

  async take(name: LimitName, key: string, cost = 1): Promise<void> {
    const limit = LIMITS[name];
    const id = `${name}:${key}`;
    const t = this.now();
    const b = this.buckets.get(id) ?? { tokens: limit.capacity, at: t };
    b.tokens = Math.min(limit.capacity, b.tokens + ((t - b.at) / 60_000) * limit.refillPerMinute);
    b.at = t;
    if (b.tokens < cost) {
      const retryAfter = Math.ceil(((cost - b.tokens) / limit.refillPerMinute) * 60);
      this.buckets.set(id, b);
      throw new AppError('rate_limited', 'Too many requests — please slow down a little.', { retryAfterSeconds: retryAfter, limit: name });
    }
    b.tokens -= cost;
    this.buckets.set(id, b);
    if (this.buckets.size > 50_000) this.buckets.clear(); // bound memory
  }
}
