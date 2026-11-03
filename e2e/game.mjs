import { BASE, launch, onboard, watch } from './lib.mjs';
import axe from 'axe-core';

const errors = [];
const browser = await launch();
const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const page = await context.newPage();
watch(page, errors);

try {
  await page.goto(`${BASE}/welcome`);
  await onboard(page, { name: 'Game tester' });
  await page.locator('.w-marker').first().click();
  await page.getByRole('button', { name: /explore the village/i }).click();
  const game = page.getByRole('application');
  await game.waitFor();
  if (!(await page.locator('.play-world__canvas').isVisible())) throw new Error('Village scene did not render');
  const frameStats = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    let last = performance.now();
    const start = last;
    const tick = (time) => {
      samples.push(time - last);
      last = time;
      if (time - start < 1500) requestAnimationFrame(tick);
      else {
        samples.sort((a, b) => a - b);
        resolve({ fps: Math.round(samples.length / 1.5), p50: samples[Math.floor(samples.length * 0.5)].toFixed(1), p95: samples[Math.floor(samples.length * 0.95)].toFixed(1), over50ms: samples.filter((sample) => sample > 50).length });
      }
    };
    requestAnimationFrame(tick);
  }));
  await game.focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2200);
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: /talk to amina/i }).waitFor({ timeout: 5000 });
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'Amina' }).getByText(/As-salamu alaykum/i).waitFor();
  await page.screenshot({ path: 'docs/game/village-playable.png' });
  await page.evaluate(axe.source);
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations);
  if (violations.length) throw new Error(`Accessibility violations: ${violations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ')}`);

  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('saja:settings:v1'));
    value.state.locale = 'ar';
    localStorage.setItem('saja:settings:v1', JSON.stringify(value));
  });
  await page.reload();
  if (await page.locator('html').getAttribute('dir') !== 'rtl') throw new Error('Arabic locale did not set RTL direction');
  await page.locator('.w-marker').first().click();
  await page.getByRole('button', { name: /استكشف القرية/ }).click();
  const arabicGame = page.getByRole('application');
  await arabicGame.focus();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2200);
  await page.keyboard.up('ArrowLeft');
  await page.getByRole('button', { name: /تحدّث مع أمينة/ }).waitFor({ timeout: 5000 });
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'أمينة' }).getByText(/السلام عليكم/).waitFor();
  await page.screenshot({ path: 'docs/game/village-playable-ar.png' });
  await page.evaluate(axe.source);
  const arabicViolations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations);
  if (arabicViolations.length) throw new Error(`Arabic accessibility violations: ${arabicViolations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ')}`);

  await page.getByRole('button', { name: /العودة إلى العالم/ }).click();
  await page.locator('.w-marker').nth(1).click();
  await page.getByRole('button', { name: /استكشف الساحة/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const joystick = page.locator('.play-world__joystick');
  const box = await joystick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.22, { steps: 8 });
  await page.waitForTimeout(1200);
  await page.mouse.up();
  const yusufPrompt = page.getByRole('button', { name: /تحدّث مع الجد يوسف/ });
  await yusufPrompt.waitFor({ timeout: 5000 });
  await page.waitForTimeout(600);
  await yusufPrompt.waitFor({ state: 'visible' });
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'الجد يوسف' }).waitFor();
  await page.screenshot({ path: 'docs/game/courtyard-playable.png' });
  const unexpectedErrors = errors.filter((error) => !error.includes('fonts.googleapis.com'));
  if (unexpectedErrors.length) throw new Error(unexpectedErrors.join('\n'));
  console.log('✓ Village: English/Arabic keyboard movement, RTL direction, NPC dialogue, axe WCAG 2.1 A/AA scans');
  console.log('✓ Courtyard: Arabic mobile joystick movement, proximity prompt and NPC dialogue');
  console.log(`  Headless Chrome frame sample (desktop scene): ${frameStats.fps} fps, p50 ${frameStats.p50} ms, p95 ${frameStats.p95} ms, >50 ms ${frameStats.over50ms}`);
} finally {
  await browser.close();
}
