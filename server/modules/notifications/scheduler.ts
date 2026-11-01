import type { Services } from '../../context.ts';
import { log } from '../../lib/log.ts';
import { runDue } from './service.ts';
import { runFileDeletions, runRetention } from '../lifecycle.ts';

/**
 * Single-instance scheduler loop: due notifications and queued file deletions
 * every tick, retention hourly. In a multi-instance deployment, run it in one worker.
 */
export function startScheduler(s: Services, everyMs = 30_000) {
  let lastRetention = 0;
  const id = setInterval(() => {
    runDue(s).catch((e) => log.error('scheduler.notifications_failed', { error: e }));
    runFileDeletions(s).catch((e) => log.error('scheduler.file_deletions_failed', { error: e }));
    if (Date.now() - lastRetention > 3_600_000) {
      lastRetention = Date.now();
      runRetention(s).catch((e) => log.error('scheduler.retention_failed', { error: e }));
    }
  }, everyMs);
  return () => clearInterval(id);
}
