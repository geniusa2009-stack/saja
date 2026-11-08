import { Hono } from 'hono';
import { ZodError } from 'zod';
import type { AppEnv, Services } from './context.ts';
import { AppError } from './lib/errors.ts';
import { log } from './lib/log.ts';
import { clientIp } from './lib/http.ts';
import { csrfMiddleware, sessionMiddleware } from './auth/middleware.ts';
import { authRoutes } from './auth/routes.ts';
import { profileRoutes } from './modules/profile.ts';
import { guardianRoutes } from './modules/guardian.ts';
import { analyticsRoutes } from './modules/analytics.ts';
import { systemRoutes } from './modules/system.ts';
import { sirajRoutes } from './modules/siraj/routes.ts';
import { missionRoutes, attemptRoutes, progressRoutes } from './modules/missions/routes.ts';
import { notificationRoutes } from './modules/notifications/routes.ts';
import { dayRoutes, prayerRoutes } from './modules/day.ts';
import { circleRoutes, messageRoutes, blockRoutes, moderationRoutes } from './modules/community/routes.ts';
import { dmRoutes } from './modules/community/dm.ts';
import { streamRoutes } from './modules/stream.ts';
import { scholarRoutes, scholarProfileRoutes, adminScholarRoutes } from './modules/scholar.ts';
import { uploadRoutes } from './modules/trust/uploads.ts';
import { auditRoutes } from './modules/trust/audits.ts';
import { timeLimitMiddleware, usageRoutes } from './modules/usage.ts';
import { adminRoutes } from './modules/admin.ts';
import { knowledgeRoutes, dailyRoutes, searchRoutes } from './modules/knowledge/routes.ts';
import { contentRoutes } from './modules/content/routes.ts';
import { hadithRoutes } from './modules/content/hadith.ts';

export function createApp(services: Services) {
  const app = new Hono<AppEnv>().basePath('/api');

  app.use('*', async (c, next) => {
    c.set('services', services);
    c.header('x-content-type-options', 'nosniff');
    c.header('referrer-policy', 'same-origin');
    c.header('cache-control', 'no-store');
    await next();
  });
  app.use('*', csrfMiddleware);
  app.use('*', sessionMiddleware);
  // Guardian time limits are measured and enforced here, for every route (see modules/usage.ts).
  app.use('*', timeLimitMiddleware);
  // Every state-changing request spends from a general per-user (or per-IP) write budget,
  // on top of the stricter per-feature limits (auth, AI, chat, scholar, audit, upload).
  app.use('*', async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') await services.limiter.take('write', c.get('access')?.userId ?? `ip:${clientIp(c)}`);
    await next();
  });

  app.route('/system', systemRoutes);
  app.route('/auth', authRoutes);
  app.route('/profile', profileRoutes);
  app.route('/guardian', guardianRoutes);
  app.route('/analytics', analyticsRoutes);
  app.route('/knowledge', knowledgeRoutes);
  app.route('/daily', dailyRoutes);
  app.route('/search', searchRoutes);
  app.route('/siraj', sirajRoutes);
  app.route('/missions', missionRoutes);
  app.route('/attempts', attemptRoutes);
  app.route('/progress', progressRoutes);
  app.route('/notifications', notificationRoutes);
  app.route('/day', dayRoutes);
  app.route('/prayer', prayerRoutes);
  app.route('/circles', circleRoutes);
  app.route('/messages', messageRoutes);
  app.route('/blocks', blockRoutes);
  app.route('/moderation', moderationRoutes);
  app.route('/dm', dmRoutes);
  app.route('/stream', streamRoutes);
  app.route('/scholar', scholarRoutes);
  app.route('/scholars', scholarProfileRoutes);
  app.route('/admin/scholars', adminScholarRoutes);
  app.route('/uploads', uploadRoutes);
  app.route('/audits', auditRoutes);
  app.route('/usage', usageRoutes);
  app.route('/admin', adminRoutes);
  app.route('/content', contentRoutes);
  app.route('/hadith', hadithRoutes);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'No such endpoint.' } }, 404));
  app.onError((err, c) => {
    if (err instanceof AppError) {
      if (err.code === 'rate_limited' && err.details?.retryAfterSeconds) c.header('retry-after', String(err.details.retryAfterSeconds));
      return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
    }
    if (err instanceof ZodError) return c.json({ error: { code: 'bad_request', message: 'Some fields are invalid.' } }, 400);
    // A malformed id reaching Postgres (invalid uuid text) is simply "not found", never a 500.
    if ((err as { code?: string }).code === '22P02') return c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404);
    log.error('request.failed', { path: c.req.path, method: c.req.method, error: err });
    return c.json({ error: { code: 'internal', message: 'Something went wrong on our side.' } }, 500);
  });
  return app;
}

export type App = ReturnType<typeof createApp>;
