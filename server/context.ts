import type { Config } from './config.ts';
import type { Db } from './db/index.ts';
import type { RateLimiter } from './lib/rateLimit.ts';
import type { EventBus } from './lib/bus.ts';
import type { AiBudget } from './ai/guard.ts';
import type { FrameExtractor } from './ai/frames.ts';
import type { AIService, EmbeddingProvider, TranscriptionProvider } from './ai/types.ts';
import type { Mailer } from './lib/mailer.ts';
import type { Storage } from './lib/storage.ts';
import type { Pusher } from './modules/notifications/push.ts';
import type { Access } from './auth/access.ts';

/** Everything a route or service needs, created once at startup (and per test). */
export interface Services {
  config: Config;
  db: Db;
  limiter: RateLimiter;
  bus: EventBus;
  aiBudget: AiBudget;
  frames: FrameExtractor;
  /** The provider router: every model call goes through it. */
  ai: AIService;
  embeddings: EmbeddingProvider;
  transcription: TranscriptionProvider;
  mailer: Mailer;
  storage: Storage;
  push: Pusher;
  now: () => Date;
}

export type AppEnv = {
  Variables: {
    services: Services;
    access: Access | null;
    sessionId: string | null;
  };
};
