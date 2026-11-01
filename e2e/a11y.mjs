/**
 * Accessibility audit with axe-core (WCAG 2.1 A/AA rules) on every main screen,
 * English and Arabic, phone and desktop. Serious and critical findings fail the run.
 *   sh e2e/serve.sh && node e2e/visual.mjs setup && node e2e/a11y.mjs
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { BASE, SHOTS, check, launch } from './lib.mjs';

const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const PAGES = ['/welcome', '/', '/mission/m-water-path', '/journey', '/learn', '/explore', '/day', '/circles', '/circles/first-steps', '/messages', '/scholar', '/amanah', '/nour', '/profile', '/profile/memory', '/inbox', '/account'];
const browser = await launch();
const found = new Map(); // rule → { impact, help, where: Set }
const all = [];

for (const locale of ['en', 'ar']) {
  for (const [w, h, mobile] of [
    [375, 812, true],
    [1280, 800, false],
  ]) {
    const state = JSON.parse(readFileSync(`${SHOTS}/state.json`, 'utf8'));
    for (const o of state.origins) for (const item of o.localStorage) if (item.name === 'saja:settings:v1') item.value = JSON.stringify({ ...JSON.parse(item.value), state: { ...JSON.parse(item.value).state, locale, introSeenAt: Date.now() } });
    const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: locale === 'ar' ? 'ar' : 'en-GB', bypassCSP: true }); // the audit script is injected; production CSP rightly forbids that
    await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(1500);
      await page.addScriptTag({ path: AXE });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')}${n.any?.[0]?.message ? ` — ${n.any[0].message.slice(0, 120)}` : ''}`) }));
      });
      for (const v of res) {
        all.push({ where: `${locale}-${w}${path}`, ...v });
        const e = found.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set(), nodes: new Set() };
        e.where.add(`${locale}-${w}${path}`);
        v.nodes.forEach((n) => e.nodes.add(n));
        found.set(v.id, e);
      }
    }
    await ctx.close();
  }
}
for (const [id, e] of found) {
  console.log(`${e.impact.padEnd(9)} ${id}: ${e.help} (${e.where.size} screens)`);
  for (const n of [...e.nodes].slice(0, 4)) console.log(`            ${n}`);
}
await check(`axe WCAG 2.1 A/AA: no serious or critical violations on ${PAGES.length} screens × EN/AR × 375/1280`, async () => {
  const bad = [...found].filter(([, e]) => e.impact === 'serious' || e.impact === 'critical');
  if (bad.length) throw new Error(bad.map(([id, e]) => `${id} (${e.where.size})`).join(', '));
});
await browser.close();
