/** Bilingual audience acceptance and mobile layout screenshots, no new user data persisted outside local test DB. */
import { BASE, SHOTS, launch, onboard, watch } from './lib.mjs';

const browser = await launch();
const errors = [];
const paths = [
  { locale: 'en', purposeIndex: 0, name: 'Explorer', heading: 'Explore Islam your way', guide: 'Explore at your own pace' },
  { locale: 'en', purposeIndex: 1, name: 'Beginner', heading: 'Your next step, at your pace', guide: 'A gentle path through the foundations' },
  { locale: 'en', purposeIndex: 2, name: 'Learner', heading: 'Deeper knowledge, your choice', guide: 'Go deeper into sources and meaning' },
  { locale: 'ar', purposeIndex: 2, name: 'سلمى', heading: 'معرفة أعمق، على اختيارك', guide: 'تعمّق في المصادر والمعاني' },
];
try {
  for (const p of paths) {
    const ar = p.locale === 'ar';
    const context = await browser.newContext({ locale: ar ? 'ar-EG' : 'en-GB', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    watch(page, errors);
    await onboard(page, { name: p.name, locale: p.locale, band: ar ? '١٨ فأكثر' : /18 or older/i, purposeIndex: p.purposeIndex, landing: 'native' });
    await page.waitForURL((url) => url.pathname === '/home');
    await page.getByRole('heading', { name: p.heading }).waitFor();
    await page.getByRole('heading', { name: p.guide }).waitFor();
    const direction = await page.evaluate(() => document.documentElement.dir);
    if (direction !== (ar ? 'rtl' : 'ltr')) throw new Error(`${p.name}: incorrect document direction: ${direction}`);
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
    if (over > 8) throw new Error(`${p.name}: mobile horizontal overflow by ${over}px`);
    const screenName = ar ? 'adult-ar' : `adult-${p.purposeIndex}-en`;
    await page.screenshot({ path: `${SHOTS}/experience-${screenName}-mobile.png`, fullPage: true });
    await page.goto(`${BASE}/catalog`);
    const labels = await page.locator('.exph-trust').count();
    if (labels < 1) throw new Error(`${p.name}: content provenance labels are missing`);
    await context.close();
  }
  const context = await browser.newContext({ locale: 'ar-EG', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const child = await context.newPage();
  watch(child, errors);
  await onboard(child, { locale: 'ar', band: 'أقل من ١٣', name: 'سارة', landing: 'native' });
  await child.goto(`${BASE}/home`);
  await child.getByRole('heading', { name: 'عالمك مليان اكتشافات' }).waitFor();
  await child.getByRole('heading', { name: 'ابدأ بالمغامرة المناسبة ليك' }).waitFor();
  await child.screenshot({ path: `${SHOTS}/experience-child-ar-mobile.png`, fullPage: true });
  await child.goto(`${BASE}/catalog`);
  if (await child.locator('a[href="/scholar"],a[href="/amanah"],a[href="/nour"]').count()) throw new Error('Child catalog exposes adult-only tools');
  await context.close();
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
  console.log('✓ All SAJA audience home variants, Arabic RTL, small-screen overflow, source status and child index verified');
  console.log('✓ Mobile screenshots saved to ' + SHOTS);
} finally {
  await browser.close();
}
