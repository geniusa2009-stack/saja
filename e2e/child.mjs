/**
 * A child (Arabic) and a guardian (English), two separate browsers:
 * the child can't join circles until a guardian links with the child's code,
 * consents and approves a circle; private messages never appear for the child;
 * the guardian sees today's usage and can add time.
 */
import { randomBytes } from 'node:crypto';
import { BASE, SHOTS, check, launch, onboard, watch } from './lib.mjs';

const errors = [];
const browser = await launch();
const kidCtx = await browser.newContext({ locale: 'ar', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const kid = await kidCtx.newPage();
watch(kid, errors);
const parentCtx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 } });
const parent = await parentCtx.newPage();
watch(parent, errors);
const api = (page, path) => page.evaluate(async (p) => (await fetch(`/api${p}`)).json(), path);
let code = '';

await check('an Arabic child onboards on a phone; the app is right-to-left', async () => {
  await kid.goto(BASE);
  await kid.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(kid, { locale: 'ar', band: 'أقل من ١٣', name: 'سارة' });
  if ((await kid.evaluate(() => document.documentElement.dir)) !== 'rtl') throw new Error('not rtl');
  let me = await api(kid, '/auth/me');
  for (let i = 0; i < 20 && !me.user; i++) {
    await kid.waitForTimeout(250); // the guest session is created just after onboarding
    me = await api(kid, '/auth/me');
  }
  if (me.user.ageBand !== 'child' || me.user.communityAllowed) throw new Error(JSON.stringify(me.user));
});

await check('circles explain that a guardian must consent — no join button', async () => {
  await kid.goto(`${BASE}/circles`);
  await kid.getByText(/يجب أن يربط أحد والديك/).first().waitFor();
  if (await kid.getByRole('button', { name: 'انضم إلى الحلقة' }).count()) throw new Error('join button shown to child without consent');
});

await check('private messages are not offered to a child anywhere', async () => {
  await kid.goto(`${BASE}/messages`);
  await kid.getByText('الرسائل الخاصة للبالغين فقط').waitFor();
});

await check('the child gets a one-time guardian code, and sees time measured by the server', async () => {
  await kid.goto(`${BASE}/profile`);
  await kid.getByRole('button', { name: 'احصل على رمز لوليّ أمري' }).click();
  code = (await kid.locator('.code-box').innerText()).trim();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new Error(`code: ${code}`);
  await kid.getByText(/وقت اليوم: .* من ٤٥ دقيقة/).waitFor({ timeout: 70000 });
});

await check('a guardian signs up, links with the code and gives consent', async () => {
  await parent.goto(BASE);
  await parent.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(parent, { name: 'Huda' });
  await parent.goto(`${BASE}/account`);
  await parent.getByLabel('Email').fill(`guardian-${Date.now()}@example.test`);
  await parent.getByLabel('Password').fill(randomBytes(12).toString('base64url'));
  await parent.getByRole('button', { name: 'Save my journey' }).click();
  await parent.waitForURL(/\/profile/);
  await parent.getByLabel('Code from the child’s device').fill(code);
  await parent.getByRole('checkbox').check();
  await parent.getByRole('button', { name: 'Link and give consent' }).click();
  await parent.getByText('سارة').first().waitFor();
});

await check('the guardian approves a circle, sees today’s usage and adds 15 minutes', async () => {
  await parent.getByRole('button', { name: /حلقة الحديقة|Garden Circle/ }).click();
  await parent.getByText(/Today: \d+ of 45 minutes/).waitFor();
  await parent.getByRole('button', { name: '+15 min today' }).click();
  await parent.getByText(/Today: \d+ of 60 minutes/).waitFor();
  await parent.screenshot({ path: `${SHOTS}/guardian-panel.png`, fullPage: true });
});

await check('now the child can join the approved circle and send an encouraging reply', async () => {
  await kid.goto(`${BASE}/circles`);
  await kid.getByRole('button', { name: 'انضم إلى الحلقة' }).click();
  await kid.waitForURL(/\/circles\/garden/);
  await kid.getByRole('button', { name: 'أحسنت!' }).first().click();
  await kid.getByText('أحسنت!').nth(1).waitFor();
});

await check('a child’s message with a phone number is refused before it is stored', async () => {
  const box = kid.getByPlaceholder(/اكتب شيئًا مشجعًا/);
  await box.fill('رقمي 0551234567');
  await box.press('Enter');
  await kid.getByRole('alert').waitFor();
  const msgs = await api(kid, '/circles/garden/messages');
  if (msgs.messages.some((m) => m.body.includes('0551234567'))) throw new Error('stored');
  await kid.screenshot({ path: `${SHOTS}/child-circle-ar.png`, fullPage: true });
});

await check('no uncaught errors in either browser', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});

await browser.close();
