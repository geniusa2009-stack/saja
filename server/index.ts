import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.ts';
import { createServices } from './services.ts';
import { createApp } from './app.ts';
import { log } from './lib/log.ts';
import { startScheduler } from './modules/notifications/scheduler.ts';

const config = loadConfig();
for (const w of config.warnings) log.warn('config.warning', { warning: w });
const services = await createServices(config);
const api = createApp(services);
startScheduler(services);

// In production the same process serves the built web app, so the API and the
// pages share one origin (cookies stay SameSite, no CORS surface at all).
const root = new Hono();
root.route('/', api);
root.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'No such endpoint.' } }, 404));
const staticDir = config.STATIC_DIR;
if (staticDir && existsSync(join(staticDir, 'index.html'))) {
  const indexHtml = readFileSync(join(staticDir, 'index.html'), 'utf8');
  const CSP = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  root.use('*', async (c, next) => {
    await next();
    c.header('content-security-policy', CSP);
    c.header('x-content-type-options', 'nosniff');
    c.header('referrer-policy', 'same-origin');
    c.header('permissions-policy', 'camera=(), microphone=(), geolocation=(self)');
    if (c.res.headers.get('content-type')?.startsWith('text/html')) c.header('cache-control', 'no-cache');
    if (config.cookieSecure) c.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
  });
  root.use('/assets/*', async (c, next) => {
    await next();
    // Hashed files never change; a miss must never be cached.
    if (c.res.status === 200) c.header('cache-control', 'public, max-age=31536000, immutable');
  });
  root.use('*', serveStatic({ root: staticDir }));
  // A missing hashed file (e.g. a chunk from the previous release) is a 404, not the app shell:
  // HTML in place of a script fails with a MIME error; a 404 lets the client reload into the new release.
  root.get('/assets/*', (c) => c.text('Not found', 404, { 'cache-control': 'no-store' }));
  root.get('*', (c) => {
    c.header('cache-control', 'no-cache'); // always revalidate the shell so a new release is picked up
    return c.html(indexHtml);
  }); // SPA fallback for client routes
}

serve({ fetch: root.fetch, port: config.PORT }, (info) => {
  log.info('server.started', { port: info.port, capabilities: Object.entries(config.modes).map(([k, v]) => `${k}=${v}`).join(' '), static: Boolean(staticDir) });
});
