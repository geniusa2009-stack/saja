/**
 * Cost and safety guard around every model call.
 *
 *  - Budget: a per-user daily allowance shared by all AI features. When it runs
 *    out, features fall back to deterministic/extractive paths (Siraj, question
 *    organising) or say "not available today" (reading images) — never a guess.
 *  - Telemetry and per-provider free-tier caps live in the router (router.ts):
 *    purpose, provider, model, latency, tokens and outcome — never the prompt or the answer.
 *  - Compaction: long inputs are trimmed before they reach a model.
 * Callers are expected to try deterministic logic and retrieval first; the
 * budget is the last line, not the first.
 */

export interface AiBudget {
  /** Spends one call from the user's daily allowance; false when exhausted. */
  tryConsume(userId: string, purpose: string): Promise<boolean>;
}

/** Single-process budget (the default). Swap for a shared store when running several instances. */
export class MemoryAiBudget implements AiBudget {
  private used = new Map<string, number>();
  constructor(
    private limit: number,
    private now: () => Date = () => new Date(),
  ) {}
  async tryConsume(userId: string) {
    const key = `${userId}:${this.now().toISOString().slice(0, 10)}`;
    const n = this.used.get(key) ?? 0;
    if (n >= this.limit) return false;
    this.used.set(key, n + 1);
    if (this.used.size > 100_000) this.used.clear();
    return true;
  }
  reset() {
    this.used.clear();
  }
}

/** Trims text to `max` characters, preferring a sentence boundary. */
export function compact(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('؟ '), cut.lastIndexOf('? '));
  return end > max * 0.6 ? cut.slice(0, end + 1) : cut;
}
