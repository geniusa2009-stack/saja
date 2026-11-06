/**
 * Visual QA: every main screen at 375 / 768 / 1280 px in English and Arabic.
 * Checks: no horizontal page overflow, no controls clipped off-screen, no error
 * boundary, correct direction; saves a screenshot of each for review.
 *   phase=setup  → creates an adult account with progress (storage state saved)
 *   phase=shots  → screenshots + checks (after the account was made admin via the CLI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { BASE, SHOTS, check, launch, onboard, watch } from './lib.mjs';

const STATE = `${SHOTS}/state.json`;
const phase = process.argv[2] ?? 'shots';
const browser = await launch();

if (phase === 'setup') {
  const ctx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(page, { name: 'Maryam' });
  const email = `visual-${Date.now()}@example.test`;
  await page.goto(`${BASE}/account`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(randomBytes(12).toString('base64url'));
  await page.getByRole('button', { name: 'Save my journey' }).click();
  await page.waitForURL(/\/profile/);
  // Some journey state, through the real API.
  await page.evaluate(async () => {
    const h = { 'content-type': 'application/json', 'x-saja-csrf': '1' };
    const a = await (await fetch('/api/missions/m-water-path/attempts', { method: 'POST', headers: h, body: JSON.stringify({ modality: 'hands-on' }) })).json();
    await fetch(`/api/attempts/${a.attemptId}/complete`, { method: 'POST', headers: h, body: JSON.stringify({ modality: 'hands-on', durationMs: 90000 }) });
    await fetch('/api/circles/first-steps/join', { method: 'POST', headers: h });
    await fetch('/api/circles/first-steps/messages', { method: 'POST', headers: h, body: JSON.stringify({ body: 'Assalamu alaykum — the Water Path was lovely.' }) });
    await fetch('/api/scholar/questions', { method: 'POST', headers: h, body: JSON.stringify({ question: 'How do I make up missed prayers?', topic: 'prayer' }) });
  });
  await ctx.storageState({ path: STATE });
  writeFileSync(`${SHOTS}/email.txt`, email);
  console.log('setup done');
  await browser.close();
  process.exit(0);
}

const PAGES = ['/', '/mission/m-water-path', '/journey', '/learn', '/explore', '/day', '/circles', '/circles/first-steps', '/messages', '/scholar', '/amanah', '/nour', '/profile', '/profile/memory', '/inbox', '/account', '/staff', '/hadith', '/hadith/h-bukhari-1', '/hadith/discover', '/hadith/discover/scenario-new-neighbour', '/hadith/discover/match-mercy-words', '/hadith/discover/story-two-lamps', '/hadith/discover/sort-where-from', '/hadith/discover/reflection-mercy', '/hadith/discover/review-foundations'];
const SIZES = [
  [375, 812, true],
  [768, 1024, true],
  [1280, 800, false],
];
const errors = [];
const problems = [];
for (const locale of ['en', 'ar']) {
  for (const [w, h, mobile] of SIZES) {
    const state = JSON.parse(readFileSync(STATE, 'utf8'));
    for (const o of state.origins) for (const item of o.localStorage) if (item.name === 'saja:settings:v1') item.value = JSON.stringify({ ...JSON.parse(item.value), state: { ...JSON.parse(item.value).state, locale, introSeenAt: Date.now() } });
    const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: locale === 'ar' ? 'ar' : 'en-GB' });
    await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
    const page = await ctx.newPage();
    watch(page, errors);
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(1400);
      // The "next prayer" countdown changes length through the day: measure its longest form,
      // so the result doesn't depend on when the suite runs. (A fake clock would freeze animations.)
      if (path === '/day') await page.evaluate((ar) => document.querySelectorAll('.next-prayer__time').forEach((el) => (el.textContent = ar ? 'بعد ١١ س ٥١ د' : 'in 11 h 51 min')), locale === 'ar');
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const scrollers = (el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p !== document.body && p !== document.documentElement) return true;
          }
          return false;
        };
        const clipped = [...document.querySelectorAll('button, a, input, textarea, select, [role=button]')]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && (b.right > vw + 1 || b.left < -1) && !scrollers(el) && !el.closest('[aria-hidden=true], .world, .world-scroll');
          })
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"`);
        // A control whose centre is covered by some OTHER fixed element (e.g. a floating button over "send").
        const coveredNow = (el) => {
          const b = el.getBoundingClientRect();
          if (b.width < 8 || b.height < 8 || b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > vw) return false;
          const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (!top || el.contains(top) || top.contains(el)) return false;
          for (let p = top; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed' && !p.matches('[role=dialog], [role=alertdialog], .sheet, .night-backdrop, .rail, .bottombar')) return true;
          return false;
        };
        // Content scrolls under a floating button; what matters is a control that stays covered
        // even when scrolled to the middle of the screen (e.g. a composer's send button).
        const covered = [...document.querySelectorAll('main button, main input, main textarea, main a')]
          .filter(coveredNow)
          .filter((el) => {
            const y = scrollY;
            el.scrollIntoView({ block: 'center', inline: 'nearest' });
            const still = coveredNow(el);
            scrollTo(0, y);
            return still;
          })
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent || '').trim().slice(0, 30)}"`);
        return {
          covered,
          overflow: document.documentElement.scrollWidth - vw,
          dir: document.documentElement.dir,
          boundary: /Something went quiet|هدأ شيء ما/.test(document.body.innerText),
          clipped,
        };
      });
      const name = `${locale}-${w}${path.replace(/\//g, '_') || '_home'}`;
      await page.screenshot({ path: `${SHOTS}/${name}.png` });
      if (r.overflow > 0) problems.push(`${name}: page overflows by ${r.overflow}px`);
      if (r.clipped.length) problems.push(`${name}: clipped ${r.clipped.join(', ')}`);
      if (r.covered.length) problems.push(`${name}: covered by a floating element ${r.covered.join(', ')}`);
      if (r.boundary) problems.push(`${name}: error boundary`);
      if (r.dir !== (locale === 'ar' ? 'rtl' : 'ltr')) problems.push(`${name}: dir=${r.dir}`);
    }
    await ctx.close();
  }
}
await check(`${PAGES.length} screens × 3 sizes × 2 languages: no overflow, clipping, covered controls, errors or wrong direction`, async () => {
  if (problems.length) throw new Error(`\n       ${problems.join('\n       ')}`);
});
await check('no uncaught browser errors', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});
await browser.close();
