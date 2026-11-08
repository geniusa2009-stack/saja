/**
 * Measured load cost of the built app (production server, headless Chrome, no throttling):
 * bytes transferred and timings for (1) a first visit to the welcome screen, (2) the world home
 * for a returning traveller and (3) entering the 3D village until the player is ready.
 * Usage: sh e2e/serve.sh && node e2e/perf.mjs   (honours E2E_PORT / SAJA_URL)
 */
import { BASE, launch, onboard } from './lib.mjs';

const browser = await launch();
const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
// THROTTLE=4g: a 4G-like link (9 Mbps down, 1.5 Mbps up, 170 ms latency) for the 3D-entry measurement.
const THROTTLE = process.env.THROTTLE === '4g' ? { offline: false, latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 } : null;
// READ_MS: how long the learner spends on the location sheet before "Explore" (prefetch window).
const READ_MS = Number(process.env.READ_MS ?? 1500);
let bytes = new Map();
cdp.on('Network.loadingFinished', (e) => bytes.set(e.requestId, e.encodedDataLength));
const urls = new Map();
cdp.on('Network.responseReceived', (e) => urls.set(e.requestId, { url: e.response.url, encoding: e.response.headers['content-encoding'] ?? e.response.headers['Content-Encoding'] ?? '' }));
const reset = () => {
  bytes = new Map();
};
const total = () => [...bytes.values()].reduce((a, b) => a + b, 0);
const top = (n) =>
  [...bytes.entries()]
    .map(([id, b]) => ({ b, ...(urls.get(id) ?? { url: id }) }))
    .sort((a, b) => b.b - a.b)
    .slice(0, n)
    .map((r) => `${(r.b / 1024).toFixed(0).padStart(6)} KB  ${r.encoding || 'identity'}  ${r.url.replace(BASE, '')}`);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// 1. First visit: welcome screen, cold cache.
reset();
let t0 = Date.now();
await page.goto(`${BASE}/welcome`, { waitUntil: 'load' });
const welcome = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), fcp: Math.round(fcp?.startTime ?? -1) };
});
console.log(`First visit /welcome: ${kb(total())} transferred, FCP ${welcome.fcp} ms, DOMContentLoaded ${welcome.domContentLoaded} ms, load ${welcome.load} ms`);
for (const line of top(6)) console.log(`  ${line}`);

// 2. Returning traveller: world home after onboarding (warm cache for shared chunks).
await onboard(page, { name: 'Perf' });
reset();
t0 = Date.now();
await page.goto(BASE, { waitUntil: 'load' });
await page.locator('.w-marker').first().waitFor();
console.log(`World home (warm): ${kb(total())} transferred, interactive markers after ${Date.now() - t0} ms`);

// 3. Entering the 3D village, cold for the 3D code and the GLB.
if (THROTTLE) await cdp.send('Network.emulateNetworkConditions', THROTTLE);
reset();
t0 = Date.now();
await page.locator('.w-marker').first().click();
// A learner reads the location sheet before choosing "Explore"; the 3D code and model are
// prefetched meanwhile. 1.5 s is a conservative reading time.
await page.waitForTimeout(READ_MS);
const explore = Date.now();
await page.getByRole('button', { name: /explore the village/i }).click();
await page.getByTestId('three-player-state').waitFor({ state: 'attached', timeout: 60000 });
await page.waitForFunction(() => document.querySelector('[data-testid="three-player-state"]')?.getAttribute('data-x') === '220.0', null, { timeout: 60000 });
const ready = Date.now() - t0;
const afterExplore = Date.now() - explore;
const fps = await page.evaluate(() => new Promise((resolve) => { let n = 0; const s = performance.now(); const tick = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(tick); else resolve(n / 2); }; requestAnimationFrame(tick); }));
const memory = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
console.log(`3D village entry${THROTTLE ? ' (4G-like)' : ''}, ${READ_MS} ms on the sheet: ${kb(total())} transferred; player ready ${afterExplore} ms after "Explore" (${ready} ms after opening the sheet), ${fps} fps (software WebGL), JS heap ${memory} MB`);
for (const line of top(5)) console.log(`  ${line}`);
await browser.close();
