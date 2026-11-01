/**
 * Visual review captures — frame sequences for a human (or reviewer) to look at:
 * motion, transitions and feel, not just layout. Real Chrome, real server.
 *
 *   node e2e/review.mjs intro     cinematic intro (EN desktop, AR phone, reduced motion)
 *   node e2e/review.mjs journey   onboarding → world → walking → mission → adaptation → reward → unlock → Siraj
 *   node e2e/review.mjs pages     every main screen, EN/AR × 375/1280 (uses the journey's saved session)
 *   node e2e/review.mjs studio    staff content studio (the journey's account must be made admin with the CLI)
 *
 * Frames go to e2e/screenshots/review/<sequence>/.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { BASE, SHOTS, launch, onboard, watch } from './lib.mjs';

const OUT = `${SHOTS}/review`;
const phase = process.argv[2] ?? 'intro';
const browser = await launch();
const errors = [];
const dir = (name) => {
  const d = `${OUT}/${name}`;
  mkdirSync(d, { recursive: true });
  return d;
};
/** Screenshots at the given times (ms from now) — a flip-book of what the person sees. */
async function frames(page, name, times, opts = {}) {
  const d = dir(name);
  const start = Date.now();
  for (const [i, t] of times.entries()) {
    const wait = t - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${d}/${String(i).padStart(2, '0')}-${t}ms.png`, ...opts });
  }
}
const shot = (page, name, file, opts = {}) => page.screenshot({ path: `${dir(name)}/${file}.png`, ...opts });

if (phase === 'intro') {
  for (const [name, ctxOpts, times] of [
    ['intro-en-1280', { locale: 'en-GB', viewport: { width: 1280, height: 800 } }, [150, 600, 1100, 1600, 1900, 2100, 2300, 2500, 2800, 3200, 3800, 4500, 5200, 5600, 5900, 6100, 6300, 6600, 7000, 8500]],
    ['intro-ar-375', { locale: 'ar', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }, [300, 1200, 2200, 3200, 4500, 6000, 8500]],
    ['intro-reduced-motion', { locale: 'en-GB', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, [300, 1500, 3000, 6000]],
  ]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    watch(page, errors);
    const started = Date.now();
    await page.goto(BASE, { waitUntil: 'commit' }); // time from first paint, not from the load event (fonts can be slow)
    await frames(page, name, times);
    writeFileSync(`${OUT}/${name}/_load.txt`, `commit after ${Date.now() - started}ms`);
    await ctx.close();
  }
}

if (phase === 'journey') {
  const ctx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Riyadh' });
  const page = await ctx.newPage();
  watch(page, errors);
  await page.goto(BASE);
  await page.waitForURL(/welcome/, { timeout: 20000 });
  // Onboarding, a frame per step.
  await page.getByRole('button', { name: /begin/i }).click();
  await page.waitForTimeout(900);
  const d = 'onboarding-1280';
  let n = 0;
  const step = async () => {
    await shot(page, d, `${String(n++).padStart(2, '0')}`);
    await page.locator('.ob-foot button').last().click();
    await page.waitForTimeout(900);
  };
  await page.getByRole('radio').first().click();
  await step();
  await page.getByRole('radio', { name: /18 or older/i }).click();
  await step();
  await page.getByRole('radio').first().click();
  await step();
  await page.getByRole('checkbox').first().click();
  await step();
  await page.getByRole('radio').first().click();
  await step();
  await page.getByLabel(/your name/i).fill('Maryam');
  await shot(page, d, `${String(n++).padStart(2, '0')}-character`);
  await page.getByRole('button', { name: /enter the world/i }).click();
  // Entering the world.
  await frames(page, 'world-enter-1280', [100, 500, 1000, 1600, 2400, 3500]);

  // Walking: tap the next place and watch the traveller and camera.
  const place = page.locator('[data-location], .world-place, .loc').filter({ hasText: /Garden|Well|Water|Village/ }).first();
  if (await place.count()) {
    await place.click().catch(() => undefined);
    await frames(page, 'world-walk-1280', [80, 300, 600, 900, 1300, 1800, 2500]);
  }

  // The first mission, with two mistakes → adaptive offer → explainer → guided retry → reward.
  await page.goto(`${BASE}/mission/m-water-path`);
  await page.getByText('Demo mission · v1').waitFor();
  await shot(page, 'mission-1280', '00-intro');
  await page.getByRole('button', { name: /begin mission/i }).click();
  await page.waitForTimeout(900);
  await shot(page, 'mission-1280', '01-play');
  const press = async (label) => {
    await page.getByRole('button', { name: new RegExp(`^${label} —`) }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  };
  await press('Head');
  await shot(page, 'mission-1280', '02-first-mistake');
  await press('Left foot');
  await page.getByRole('alertdialog').waitFor({ timeout: 8000 });
  await page.waitForTimeout(600);
  await shot(page, 'mission-1280', '03-adaptive-offer');
  await page.getByRole('alertdialog').getByRole('button', { name: /^Switch/ }).click();
  await page.getByText('Step by step').waitFor({ timeout: 8000 });
  await page.waitForTimeout(700);
  await shot(page, 'mission-1280', '04-explainer-1');
  for (let i = 0; i < 5; i++) {
    await page.locator('main').getByRole('button', { name: /^(Next|I understand now)$/ }).click();
    await page.waitForTimeout(250);
  }
  await shot(page, 'mission-1280', '05-explainer-6');
  for (let i = 0; i < 6; i++) {
    await page.locator('main').getByRole('button', { name: /^(Next|I understand now)$/ }).click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(700);
  await shot(page, 'mission-1280', '06-guided-retry');
  for (const part of ['Intention', 'Hands', 'Mouth', 'Nose', 'Face', 'Right arm', 'Left arm', 'Head', 'Ears', 'Right foot']) await press(part);
  await shot(page, 'mission-1280', '07-almost');
  await press('Left foot');
  await frames(page, 'reward-1280', [100, 500, 1000, 1600, 2400, 3500]);

  // Back to the world: the unlock moment and Siraj's contextual message.
  await shot(page, 'reward-1280', '06-full', { fullPage: true });
  const back = page.locator('main').getByRole('button', { name: /world|journey|continue/i }).first();
  if (await back.count()) await back.click().catch(() => undefined);
  else await page.goto(BASE);
  await frames(page, 'unlock-1280', [200, 800, 1600, 2600, 4000]);
  await page.getByRole('button', { name: /^Later$/ }).click().catch(() => undefined);
  await page.waitForTimeout(800);
  const siraj = page.getByRole('button', { name: /ask siraj/i }).first();
  if (await siraj.count()) {
    await siraj.click();
    await page.waitForTimeout(900);
    await shot(page, 'siraj-1280', '00-open-after-mission');
  }

  // Save a signed-up session for the page captures.
  const email = `review-${Date.now()}@example.test`;
  await page.goto(`${BASE}/account`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(randomBytes(12).toString('base64url'));
  await page.getByRole('button', { name: 'Save my journey' }).click();
  await page.waitForURL(/\/profile/);
  await page.evaluate(async () => {
    const h = { 'content-type': 'application/json', 'x-saja-csrf': '1' };
    await fetch('/api/circles/first-steps/join', { method: 'POST', headers: h });
    await fetch('/api/circles/first-steps/messages', { method: 'POST', headers: h, body: JSON.stringify({ body: 'Assalamu alaykum — the Water Path was lovely.' }) });
    await fetch('/api/scholar/questions', { method: 'POST', headers: h, body: JSON.stringify({ question: 'How do I make up missed prayers?', topic: 'prayer' }) });
  });
  await ctx.storageState({ path: `${OUT}/state.json` });
  writeFileSync(`${OUT}/email.txt`, email);
  await ctx.close();
}

if (phase === 'pages') {
  if (!existsSync(`${OUT}/state.json`)) throw new Error('run the journey phase first');
  const PAGES = [
    ['world', '/'],
    ['day', '/day'],
    ['circles', '/circles'],
    ['chat', '/circles/first-steps'],
    ['messages', '/messages'],
    ['scholar', '/scholar'],
    ['amanah', '/amanah'],
    ['nour', '/nour'],
    ['journey', '/journey'],
    ['learn', '/learn'],
    ['explore', '/explore'],
    ['profile', '/profile'],
    ['memory', '/profile/memory'],
    ['account', '/account'],
    ['staff', '/staff'],
  ];
  for (const locale of ['en', 'ar']) {
    for (const [w, h, mobile] of (process.env.SIZES ?? '375,768,1280').split(',').map((x) => (x === '375' ? [375, 812, true] : x === '768' ? [768, 1024, true] : [1280, 800, false]))) {
      const state = JSON.parse(readFileSync(`${OUT}/state.json`, 'utf8'));
      for (const o of state.origins) for (const item of o.localStorage) if (item.name === 'saja:settings:v1') item.value = JSON.stringify({ ...JSON.parse(item.value), state: { ...JSON.parse(item.value).state, locale, introSeenAt: Date.now() } });
      const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: locale === 'ar' ? 'ar' : 'en-GB' });
      await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
      const page = await ctx.newPage();
      watch(page, errors);
      for (const [name, path] of PAGES) {
        await page.goto(`${BASE}${path}`);
        await page.waitForTimeout(1500);
        await shot(page, `pages-${locale}-${w}`, name);
      }
      // A few states inside pages.
      await page.goto(`${BASE}/learn`);
      await page.waitForTimeout(1000);
      await page.locator('main button, main [role=button]').filter({ hasText: /wudu|الوضوء/i }).first().click().catch(() => undefined);
      await page.waitForTimeout(1000);
      await shot(page, `pages-${locale}-${w}`, 'learn-evidence-sheet');
      await page.keyboard.press('Escape');
      await page.goto(`${BASE}/amanah`);
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /load a sample|جرّب مثالًا|مثال/i }).first().click().catch(() => undefined);
      await page.getByRole('button', { name: /check claims|افحص/i }).first().click().catch(() => undefined);
      await page.waitForTimeout(5000);
      await shot(page, `pages-${locale}-${w}`, 'amanah-result', { fullPage: true });
      await ctx.close();
    }
  }
}


if (phase === 'studio') {
  for (const [w, h, mobile] of [
    [1280, 800, false],
    [375, 812, true],
  ]) {
    const ctx = await browser.newContext({ storageState: `${OUT}/state.json`, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'en-GB' });
    await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
    const page = await ctx.newPage();
    watch(page, errors);
    const name = `studio-${w}`;
    await page.goto(`${BASE}/staff`);
    await page.waitForTimeout(1200);
    await shot(page, name, '00-tabs');
    for (const [label, file] of [
      ['Content status', '01-status'],
      ['Knowledge', '02-knowledge'],
      ['Missions', '03-missions'],
      ['Rules & texts', '06-texts'],
    ]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForTimeout(1000);
      await shot(page, name, file, { fullPage: file === '01-status' });
      if (file === '03-missions') {
        await page.getByRole('button', { name: 'Open' }).first().click();
        await page.waitForTimeout(1800);
        await shot(page, name, '04-mission-preview');
        await page.getByRole('button', { name: 'Texts', exact: true }).click();
        await page.waitForTimeout(600);
        await shot(page, name, '05-mission-texts');
        await page.getByRole('button', { name: 'Back' }).first().click();
        await page.waitForTimeout(600);
      }
      if (file === '02-knowledge') {
        await page.getByRole('button', { name: 'Open' }).first().click();
        await page.waitForTimeout(1200);
        await shot(page, name, '02b-knowledge-detail', { fullPage: true });
        await page.getByRole('button', { name: 'Back' }).first().click();
        await page.waitForTimeout(600);
      }
    }
    await ctx.close();
  }
}

if (phase === 'walk') {
  for (const [w, h, mobile] of [
    [1280, 800, false],
    [375, 812, true],
  ]) {
    const ctx = await browser.newContext({ storageState: `${OUT}/state.json`, viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'en-GB' });
    await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
    const page = await ctx.newPage();
    watch(page, errors);
    await page.goto(BASE);
    await page.waitForTimeout(1800);
    await page.keyboard.press('Escape'); // any unlock dialog
    await page.locator('.world, [class*="world"]').first().focus().catch(() => undefined);
    await page.keyboard.press('ArrowRight');
    await frames(page, `walk-${w}`, [60, 250, 500, 800, 1200, 1700, 2400]);
    await page.keyboard.press('Enter');
    await frames(page, `walk-${w}-visit`, [300, 1200]);
    await ctx.close();
  }
}

writeFileSync(`${OUT}/${phase}-errors.txt`, errors.join('\n'));
console.log(`${phase}: done, ${errors.length} browser errors`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));
await browser.close();
