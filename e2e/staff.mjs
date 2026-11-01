/**
 * The content-publishing workflow, end to end in a real browser, on a THROWAWAY e2e database:
 * an admin verifies two scholars → a scholar edits a knowledge entry and a mission text →
 * internal review → scholar review → the author can't approve their own work → the other
 * scholar approves → the admin publishes → a learner receives the new version without the demo label.
 *
 *   sh e2e/staff.sh   (creates accounts, grants the first admin with the CLI, then runs this)
 *
 * Nothing here touches a real deployment; it proves the workflow works, it publishes nothing real.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { BASE, SHOTS, check, launch, onboard, watch } from './lib.mjs';

const phase = process.argv[2];
const FILE = `${SHOTS}/staff-accounts.json`;
const browser = await launch();
const errors = [];

async function signUp(name) {
  const ctx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(page, { name });
  const email = `${name.toLowerCase()}-${Date.now()}@example.test`;
  await page.goto(`${BASE}/account`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(randomBytes(12).toString('base64url'));
  await page.getByRole('button', { name: 'Save my journey' }).click();
  await page.waitForURL(/\/profile/);
  const state = `${SHOTS}/staff-${name}.json`;
  await ctx.storageState({ path: state });
  await ctx.close();
  return { email, state };
}

if (phase === 'accounts') {
  const accounts = { admin: await signUp('Amina'), author: await signUp('Bilal'), reviewer: await signUp('Safiya') };
  writeFileSync(FILE, JSON.stringify(accounts, null, 2));
  console.log(accounts.admin.email);
  await browser.close();
  process.exit(0);
}

const accounts = JSON.parse(readFileSync(FILE, 'utf8'));
async function as(who) {
  const ctx = await browser.newContext({ storageState: accounts[who].state, locale: 'en-GB', viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('saja:intro-played', '1'));
  const page = await ctx.newPage();
  watch(page, errors);
  return page;
}
const admin = await as('admin');
const author = await as('author');
const reviewer = await as('reviewer');
const learnerCtx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 900 } });
const learner = await learnerCtx.newPage();
watch(learner, errors);
const api = (page, path) => page.evaluate(async (p) => (await fetch(`/api${p}`)).json(), path);

async function openStaff(page, tab) {
  await page.goto(`${BASE}/staff`);
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.waitForTimeout(500);
}
async function step(page, to, scope = 'Full text and sources, both languages') {
  await page.getByRole('textbox', { name: /Scope of your review/ }).fill(scope);
  await page.getByRole('button', { name: `→ ${to}` }).click();
  await page.waitForTimeout(700);
}
async function openItem(page, tab, id) {
  await openStaff(page, tab);
  await page.locator('li', { hasText: id }).first().getByRole('button', { name: 'Open' }).click();
  await page.waitForTimeout(900);
}

await check('before: everything is demo — 0 published, 0 verified scholars', async () => {
  await openStaff(admin, 'Content status');
  const st = await api(admin, '/content/status');
  if (st.knowledge.served.published || st.missions.served.published || st.scholars.verified) throw new Error(JSON.stringify(st.knowledge.served));
});

await check('the admin adds two scholar profiles (pending) and verifies them with recorded credentials and scope', async () => {
  for (const [who, name] of [
    ['author', 'Ustadh Bilal (test)'],
    ['reviewer', 'Ustadha Safiya (test)'],
  ]) {
    await openStaff(admin, 'Scholar verification');
    await admin.locator('#as-email').fill(accounts[who].email);
    await admin.locator('#as-name').fill(name);
    await admin.locator('#as-te').fill('Teacher');
    await admin.locator('#as-ta').fill('معلم');
    await admin.locator('#as-se').fill('Fiqh of worship');
    await admin.locator('#as-sa').fill('فقه العبادات');
    await admin.locator('#as-l').fill('Arabic, English');
    await admin.locator('#as-ct').fill('Ijazah (test record)');
    await admin.locator('#as-ci').fill('Example Institute (test)');
    await admin.locator('#as-cy').fill('2015');
    await admin.getByRole('button', { name: 'Create pending profile' }).click();
    await admin.waitForTimeout(800);
    await openStaff(admin, 'Scholar verification');
    const card = admin.locator('li', { hasText: name });
    await card.getByRole('textbox').fill('Fiqh of worship (test)');
    await card.getByRole('button', { name: 'Verify' }).click();
    await admin.waitForTimeout(700);
  }
  const list = (await api(admin, '/admin/scholars')).scholars;
  const verified = list.filter((s) => s.profile.verification === 'verified').map((s) => s.profile.name);
  if (verified.length !== 2) throw new Error(`verified: ${verified}`);
});

await check('a scholar edits a knowledge entry as a draft; learners still get the demo version', async () => {
  await openItem(author, 'Knowledge', 'k-sleep-dua');
  await author.getByRole('button', { name: 'Edit as draft' }).click();
  await author.locator('#cs-simple-en').fill('Before sleeping, say: “Bismika Allahumma amutu wa ahya” — “In Your name, O Allah, I die and I live.” (reviewed wording)');
  await author.locator('#cs-note').fill('Clarify the simple answer');
  await author.getByRole('button', { name: 'Save draft' }).click();
  await author.getByText('This version: draft / in review').waitFor();
  await learner.goto(BASE);
  await learner.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(learner, { name: 'Yusuf' });
  const k = await api(learner, '/knowledge/k-sleep-dua');
  if (k.version !== 1 || k.status !== 'demo') throw new Error(JSON.stringify({ v: k.version, s: k.status }));
});

await check('internal review → scholar review; the author is refused approval of their own version', async () => {
  await openItem(admin, 'Knowledge', 'k-sleep-dua');
  await step(admin, 'Internal review');
  await step(admin, 'Scholar review');
  await openItem(author, 'Knowledge', 'k-sleep-dua');
  await step(author, 'Approved');
  await author.getByText(/approved by a scholar other than its author/).waitFor();
  const r = await api(admin, '/knowledge/k-sleep-dua/reviews');
  if (r.status !== 'scholar_review') throw new Error(r.status);
});

await check('the other verified scholar approves; approved is still not published', async () => {
  await openItem(reviewer, 'Knowledge', 'k-sleep-dua');
  await step(reviewer, 'Approved');
  const k = await api(learner, '/knowledge/k-sleep-dua');
  if (k.version !== 1) throw new Error('approved content leaked before publishing');
});

await check('the admin publishes; the learner gets v2, labelled as reviewed, and Siraj answers from it', async () => {
  await openItem(admin, 'Knowledge', 'k-sleep-dua');
  await step(admin, 'Published', 'Release after scholar approval');
  const k = await api(learner, '/knowledge/k-sleep-dua');
  if (k.version !== 2 || k.status !== 'published' || k.isDemo) throw new Error(JSON.stringify({ v: k.version, s: k.status }));
  const approval = k.reviews.find((r) => r.toStatus === 'approved');
  if (!approval?.scholar?.name.includes('Safiya')) throw new Error('approving scholar not recorded');
  await learner.goto(`${BASE}/learn`);
  const card = learner.locator('button, [role=button], li, article').filter({ hasText: /What can I say before sleeping/ }).first();
  await card.getByText('Reviewed').first().waitFor({ timeout: 8000 });
  await card.click();
  await learner.getByRole('dialog').getByText(/approved by a verified scholar and published/).waitFor();
  await learner.keyboard.press('Escape');
  const ans = await learner.evaluate(async () => (await fetch('/api/siraj/ask', { method: 'POST', headers: { 'content-type': 'application/json', 'x-saja-csrf': '1' }, body: JSON.stringify({ text: 'What should I say before sleeping?', ctx: { locale: 'en' } }) })).json());
  if (ans.demoContent !== false || ans.contentVersion !== 2) throw new Error(JSON.stringify({ d: ans.demoContent, v: ans.contentVersion, s: ans.status }));
});

await check('a mission text goes through the same steps; the learner plays the published wording', async () => {
  await openItem(author, 'Missions', 'm-water-path');
  await author.getByRole('button', { name: 'Texts', exact: true }).click();
  await author.locator('[id="mt-title-en"]').fill('The Water Path (reviewed)');
  await author.locator('[id="mt-note-m-water-path"]').fill('Title wording');
  await author.getByRole('button', { name: /Save 1 changes as draft/ }).click();
  await author.waitForTimeout(800);
  await openItem(admin, 'Missions', 'm-water-path');
  await step(admin, 'Internal review');
  await step(admin, 'Scholar review');
  await openItem(reviewer, 'Missions', 'm-water-path');
  await step(reviewer, 'Approved');
  await openItem(admin, 'Missions', 'm-water-path');
  await step(admin, 'Published', 'Release after scholar approval');
  const lc = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 900 } });
  const lp = await lc.newPage();
  await lp.goto(BASE);
  await lp.waitForURL(/welcome/, { timeout: 20000 });
  await onboard(lp, { name: 'Omar' });
  await lp.goto(`${BASE}/mission/m-water-path`);
  await lp.getByRole('heading', { name: 'The Water Path (reviewed)' }).waitFor({ timeout: 10000 });
  await lp.getByText('Reviewed · v2').waitFor();
  await lc.close();
});

await check('a claim rule (code-held text) is reviewed and published the same way', async () => {
  const blocks = async (page) => (await api(page, '/content/blocks')).blocks.find((b) => b.id === 'five-prayers');
  for (const [page, to] of [
    [admin, 'Internal review'],
    [admin, 'Scholar review'],
    [reviewer, 'Approved'],
    [admin, 'Published'],
  ]) {
    await openStaff(page, 'Rules & texts');
    const card = page.locator('li', { hasText: 'five-prayers' }).first();
    await card.getByRole('button', { name: 'Review' }).click();
    await card.getByRole('textbox', { name: /Scope of your review/ }).fill('Rule wording and linked sources');
    await card.getByRole('button', { name: `→ ${to}` }).click();
    await page.waitForTimeout(700);
  }
  const b = await blocks(admin);
  if (b.review_status !== 'published' || b.published_version !== 1) throw new Error(JSON.stringify(b));
});

await check('the dashboard and audit trail show exactly what happened', async () => {
  const st = await api(admin, '/content/status');
  if (st.knowledge.served.published !== 1 || st.missions.served.published !== 1 || st.claimRules.served.published !== 1 || st.scholars.verified !== 2) throw new Error(JSON.stringify({ k: st.knowledge.served, m: st.missions.served, r: st.claimRules.served, s: st.scholars }));
  await openStaff(admin, 'Content status');
  await admin.screenshot({ path: `${SHOTS}/staff-status-after.png`, fullPage: true });
  await openStaff(admin, 'Audit trail');
  await admin.getByText('k-sleep-dua@v2').first().waitFor();
  await admin.getByText('m-water-path@v2').first().waitFor();
});

await check('no uncaught browser errors', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});
await browser.close();
