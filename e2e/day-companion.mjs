/** Day companions on mobile: accessible remembrance, local-only checkmarks, and audio opt-in. */
import { BASE, SHOTS, launch, onboard, watch } from './lib.mjs';

const browser = await launch();
const errors = [];
try {
  for (const [locale, name, band] of [
    ['en', 'Amal', /18 or older/i],
    ['ar', 'سارة', 'أقل من ١٣'],
  ]) {
    const ar = locale === 'ar';
    const context = await browser.newContext({ locale: ar ? 'ar-EG' : 'en-GB', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    watch(page, errors);
    await onboard(page, { locale, band, name, landing: 'native' });
    await page.goto(`${BASE}/day`);
    await page.getByRole('heading', { name: ar ? 'أذكار ووقفة لطيفة في يومك' : 'Remembrance and a gentle pause' }).waitFor({ timeout: 15000 });
    const mark = page.getByRole('button', { name: ar ? 'علّمها لنفسك' : 'Mark for myself' }).first();
    await mark.click();
    await page.getByRole('button', { name: ar ? 'تم اليوم ✓' : 'Done today ✓' }).first().waitFor();
    await page.reload();
    await page.getByRole('button', { name: ar ? 'تم اليوم ✓' : 'Done today ✓' }).first().waitFor();
    await page.locator('select#adhan-voice').selectOption('beautiful');
    const source = await page.locator('.adhan-preview audio').getAttribute('src');
    if (!source?.startsWith('https://upload.wikimedia.org/')) throw new Error('Licensed audio selection not persisted into player');
    if (ar && await page.getByRole('button', { name: 'السماح بإشعارات الهاتف' }).count()) throw new Error('Kids mode unexpectedly offers system push');
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
    if (overflow > 8) throw new Error(`${name}: day page overflow ${overflow}px`);
    await page.screenshot({ path: `${SHOTS}/day-${ar ? 'child-ar' : 'adult-en'}-mobile.png`, fullPage: true });
    await context.close();
  }
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
  console.log('✓ SAJA day: bilingual mobile UI, local checkmarks, adhan preview and child push gate');
} finally { await browser.close(); }
