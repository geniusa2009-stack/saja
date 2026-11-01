import type { Config } from './config.ts';
import type { Services } from './context.ts';
import { createDb } from './db/index.ts';
import { migrate } from './db/migrate.ts';
import { MemoryRateLimiter } from './lib/rateLimit.ts';
import { InProcessBus } from './lib/bus.ts';
import { MemoryAiBudget } from './ai/guard.ts';
import { ffmpegFrames, unavailableFrames } from './ai/frames.ts';
import { createAiRouter, createEmbeddings } from './ai/providers.ts';
import { singleProviderRouter } from './ai/router.ts';
import type { AIProvider, AIService } from './ai/types.ts';
import { remoteTranscription, unavailableTranscription } from './ai/transcription.ts';
import { createMailer } from './lib/mailer.ts';
import { createDiskStorage, createMemoryStorage } from './lib/storage.ts';
import { createPusher } from './modules/notifications/push.ts';
import { seed } from './db/seed.ts';
import { syncContentBlocks } from './modules/content/blocks.ts';
import { reindexStaleChunks } from './modules/knowledge/reindex.ts';

/** Tests may pass a single provider (it is wrapped in a router, like real ones) or a whole router. */
export type Overrides = Partial<Omit<Services, 'ai'>> & { ai?: AIService | AIProvider };
const isRouter = (x: AIService | AIProvider): x is AIService => x.id === 'router';

export async function createServices(config: Config, overrides: Overrides = {}): Promise<Services> {
  const { ai: aiOverride, ...rest } = overrides;
  const db = overrides.db ?? (await createDb(config));
  await migrate(db);
  const embeddings = overrides.embeddings ?? createEmbeddings(config);
  const services: Services = {
    config,
    db,
    limiter: new MemoryRateLimiter(),
    bus: new InProcessBus(),
    ai: aiOverride ? (isRouter(aiOverride) ? aiOverride : singleProviderRouter(aiOverride)) : createAiRouter(config),
    aiBudget: new MemoryAiBudget(config.SAJA_AI_DAILY_CALLS_PER_USER),
    frames: config.FFMPEG_PATH ? ffmpegFrames(config.FFMPEG_PATH) : unavailableFrames,
    embeddings,
    transcription:
      config.modes.transcription === 'remote' ? remoteTranscription(config.TRANSCRIPTION_API_URL!, config.TRANSCRIPTION_API_KEY!, config.TRANSCRIPTION_MODEL) : unavailableTranscription,
    mailer: createMailer(config, db),
    storage: config.SAJA_ENV === 'test' ? createMemoryStorage() : createDiskStorage(config.UPLOAD_DIR),
    push: createPusher(config),
    now: () => new Date(),
    ...rest,
  };
  await seed(services);
  await syncContentBlocks(db);
  await reindexStaleChunks(services);
  return services;
}
