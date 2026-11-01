/**
 * The complete SAJA journey against a running server (default http://localhost:8899):
 * intro → onboarding → character → world → first mission (with struggle → adaptive
 * response) → evidence → unlock → My Day → prayer → circle → chat → scholar →
 * AMANAH → NOUR → profile → memory → return next day.
 *
 *   node e2e/journey.mjs          (server must be running with a fresh database)
 */
import { randomBytes } from 'node:crypto';
import { BASE, SHOTS, check, launch, onboard, watch } from './lib.mjs';

const errors = [];
const browser = await launch();
const ctx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Riyadh' });
const page = await ctx.newPage();
watch(page, errors);
const api = (path, init) => page.evaluate(async ([p, i]) => (await fetch(`/api${p}`, i)).json(), [path, init ?? {}]);
const post = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-saja-csrf': '1' }, body: JSON.stringify(body ?? {}) });
const email = `journey-${Date.now()}@example.test`;
const password = randomBytes(12).toString('base64url'); // generated for this run only

await check('cinematic intro plays for a first visit, then hands over to onboarding', async () => {
  await page.goto(BASE);
  await page.waitForSelector('.intro, [class*="intro"]', { timeout: 5000 });
  await page.waitForURL(/\/welcome/, { timeout: 15000 });
  await page.getByText('Welcome to your journey.').waitFor({ timeout: 15000 });
});

await check('onboarding + character creation lead into the world (server knows the traveller)', async () => {
  await onboard(page, { name: 'Maryam' });
  await page.getByText('Maryam').first().waitFor();
  let me = await api('/auth/me');
  for (let i = 0; i < 20 && (!me.user || !me.profile); i++) {
    await page.waitForTimeout(250); // the guest journey is created on the server just after onboarding
    me = await api('/auth/me');
  }
  if (!me.user || me.profile?.display_name !== 'Maryam' || me.user.ageBand !== 'adult') throw new Error(JSON.stringify(me.user));
});

await check('the world is the home screen (path, places, Siraj) and says it is online', async () => {
  await page.getByText('The Village').first().waitFor();
  await page.getByText(/Siraj/).first().waitFor();
  const status = await api('/system/status');
  if (!status.ok) throw new Error('status');
});

await check('first mission: mistakes trigger an adaptive offer, and the mission completes', async () => {
  await page.goto(`${BASE}/mission/m-water-path`);
  await page.getByText('Demo mission · v1').waitFor();
  await page.getByRole('button', { name: /begin mission/i }).click();
  const press = async (label) => {
    await page.getByRole('button', { name: new RegExp(`^${label} —`) }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  };
  for (const wrong of ['Head', 'Left foot']) await press(wrong);
  // Two mistakes in a row: SAJA changes HOW it teaches instead of repeating.
  const offer = page.getByRole('alertdialog');
  await offer.waitFor({ timeout: 8000 });
  await offer.getByRole('button', { name: /^Switch/ }).click();
  // Illustrated explainer (11 steps) → then a guided retry of the real interaction.
  await page.getByText('Step by step').waitFor({ timeout: 8000 });
  for (let i = 0; i < 11; i++) {
    await page.locator('main').getByRole('button', { name: /^(Next|I understand now)$/ }).click();
    await page.waitForTimeout(200);
  }
  await page.getByText(/Next: Intention/).waitFor({ timeout: 8000 });
  for (const part of ['Intention', 'Hands', 'Mouth', 'Nose', 'Face', 'Right arm', 'Left arm', 'Head', 'Ears', 'Right foot', 'Left foot']) await press(part);
  await page.getByText(/Keeper of Wudu/).first().waitFor({ timeout: 15000 });
});

await check('the server recorded the completion and the version played; a new place woke up', async () => {
  await page.waitForTimeout(1500);
  const p = await api('/progress');
  if (!p.completed.includes('m-water-path')) throw new Error('not completed on server');
  if (!p.achievements.some((a) => a.id === 'keeper-of-wudu')) throw new Error('no reward');
  if (!p.unlocked.includes('garden')) throw new Error(`unlocked: ${p.unlocked}`);
});

await check('evidence opens with sources and honest provenance (demo, server version)', async () => {
  await page.goto(`${BASE}/learn`);
  await page.getByText(/How is wudu performed/i).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByText("Qur'an 5:6").first().waitFor();
  await sheet.getByText(/SAJA’s library, version 1/).waitFor();
  await sheet.getByText(/demo content, not yet reviewed by a scholar/).waitFor();
  await page.keyboard.press('Escape');
});

await check('My Day: prayer times, a plan saved on the server, and a real "Remind me later"', async () => {
  await page.goto(`${BASE}/day`);
  await page.getByText('Prayer times').waitFor();
  await page.getByText(/Saved to your journey/).waitFor({ timeout: 10000 });
  await page.getByPlaceholder(/tell me|e\.g\./i).fill('I have an exam tomorrow and only 20 minutes');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const day = await api('/day');
  if (!day.plan.constraints.some((c) => c.kind === 'exam')) throw new Error('constraints not saved');
  if (day.plan.note !== null) throw new Error('raw note was stored');
  const later = page.getByRole('button', { name: /later/i }).first();
  await later.click();
  await page.getByText(/I’ll remind you at/).waitFor({ timeout: 8000 });
  const n = await api('/notifications');
  if (!n.items.some((i) => i.status === 'scheduled' && i.category === 'prayer')) throw new Error('no scheduled reminder');
});

await check('circles ask a guest for an account; sign-up keeps the journey', async () => {
  await page.goto(`${BASE}/circles`);
  await page.getByText(/Circles need an account/).first().waitFor();
  await page.goto(`${BASE}/account`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Save my journey' }).click();
  await page.waitForURL(/\/profile/);
  const p = await api('/progress');
  if (!p.completed.includes('m-water-path')) throw new Error('journey lost on sign-up');
});

await check('join a circle and chat live (a phone number is held for a moderator)', async () => {
  await page.goto(`${BASE}/circles`);
  await page.getByRole('button', { name: 'Join circle' }).first().click();
  await page.waitForURL(/\/circles\//);
  const box = page.getByPlaceholder('Write something encouraging…');
  await box.fill('Assalamu alaykum! The Water Path helped me.');
  await box.press('Enter');
  await page.getByText('Assalamu alaykum! The Water Path helped me.').waitFor();
  await box.fill('text me 0551234567');
  await box.press('Enter');
  await page.getByText(/Waiting for a moderator/).first().waitFor();
});

await check('Ask a Scholar: organise (AI assistance only) and send to the real queue', async () => {
  await page.goto(`${BASE}/scholar`);
  await page.locator('#sch-q').fill('Can I pray in English while I learn Arabic?');
  await page.getByRole('button', { name: /help me phrase it/i }).click();
  await page.getByText(/Siraj helped organise|organised/i).first().waitFor({ timeout: 8000 }).catch(() => undefined);
  await page.getByRole('button', { name: /send to a scholar/i }).click();
  await page.getByText(/Waiting for a scholar/).first().waitFor();
  const q = await api('/scholar/questions');
  if (q.questions[0]?.status !== 'queued') throw new Error(JSON.stringify(q.questions[0]));
});

await check('AMANAH: server audit with five verdicts; a claim goes to scholar review', async () => {
  await page.goto(`${BASE}/amanah`);
  await page.getByRole('button', { name: /load a sample/i }).click();
  await page.getByRole('button', { name: /check claims/i }).click();
  await page.getByText('5 claims detected').waitFor({ timeout: 15000 });
  await page.getByText(/Checked on SAJA’s server/).waitFor();
  await page.getByRole('button', { name: /send to scholar review/i }).last().click();
  await page.getByText(/Queued for scholar review/).first().waitFor();
});

await check('NOUR: a forwarded message is checked; an image says OCR is unavailable (no guess)', async () => {
  await page.goto(`${BASE}/nour`);
  await page.getByRole('button', { name: 'Try a forwarded message' }).click();
  await page.getByRole('button', { name: 'Check it' }).click();
  await page.getByText(/claims detected/).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Image', exact: true }).click();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 9]);
  await page.locator('input[type=file]').setInputFiles({ name: 'post.png', mimeType: 'image/png', buffer: png });
  await page.getByText(/isn’t configured on this server|not configured/i).first().waitFor({ timeout: 15000 });
});

await check('profile shows the journey, the account and honest mode', async () => {
  await page.goto(`${BASE}/profile`);
  await page.getByText('Keeper of Wudu').first().waitFor();
  await page.getByText(email).first().waitFor();
  await page.getByRole('button', { name: /What’s real right now|Connected/ }).first().waitFor();
});

await check('memory: turning "conversations" on is saved on the server', async () => {
  await page.goto(`${BASE}/profile/memory`);
  await page.getByText(/Saved on SAJA’s server/).waitFor();
  await page.getByRole('switch', { name: /conversation/i }).click();
  await page.waitForTimeout(800);
  const me = await api('/auth/me');
  if (!me.user.memory.conversations) throw new Error('not saved');
});

await check('return the next day: a new page finds the journey, progress and account intact', async () => {
  const again = await ctx.newPage();
  watch(again, errors);
  await again.goto(BASE);
  await again.getByText('Maryam').first().waitFor({ timeout: 15000 });
  await again.getByText(/1 of 12 lanterns lit|1\/12/).first().waitFor();
  await again.screenshot({ path: `${SHOTS}/journey-return.png` });
  await again.close();
});

await check('no uncaught errors in the browser during the journey', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});

await browser.close();
