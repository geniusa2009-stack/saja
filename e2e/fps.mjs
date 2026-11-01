/**
 * Frame timing during motion (intro, walking, a mission): requestAnimationFrame
 * intervals measured in the page. Headless Chrome renders in software, so these
 * numbers are indicative, a floor rather than what a phone's GPU delivers.
 *   (server running; `node e2e/visual.mjs setup` done)  node e2e/fps.mjs
 */

import { BASE, SHOTS, launch } from './lib.mjs';

const browser = await launch();
const sample = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const d = [];
        let last = performance.now();
        const start = last;
        const tick = (t) => {
          d.push(t - last);
          last = t;
          if (t - start < ms) requestAnimationFrame(tick);
          else {
            d.sort((a, b) => a - b);
            const q = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
            resolve({ frames: d.length, fps: Math.round((d.length / ms) * 1000), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), longFrames: d.filter((x) => x > 50).length });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
const rows = [];
for (const [w, h, mobile] of [
  [1280, 800, false],
  [375, 812, true],
]) {
  const fresh = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'en-GB' });
  const p1 = await fresh.newPage();
  await p1.goto(BASE, { waitUntil: 'commit' });
  rows.push([`intro ${w}`, await sample(p1, 4000)]);
  await fresh.close();
  const ctx = await browser.newContext({ storageState: `${SHOTS}/state.json`, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'en-GB' });
  await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.waitForTimeout(2000);
  await p.keyboard.press('Escape');
  await p.keyboard.press('ArrowRight');
  rows.push([`walking ${w}`, await sample(p, 2500)]);
  await p.goto(`${BASE}/mission/m-dropped-lunch`);
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /begin mission/i }).click();
  rows.push([`mission start ${w}`, await sample(p, 1500)]);
  await ctx.close();
}
for (const [name, r] of rows) console.log(`${name.padEnd(18)} ${String(r.fps).padStart(3)} fps · p50 ${r.p50} ms · p95 ${r.p95} ms · frames > 50 ms: ${r.longFrames}`);
await browser.close();
