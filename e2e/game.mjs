import { BASE, SHOTS, launch, onboard, watch } from './lib.mjs';
import axe from 'axe-core';

const errors = [];
const network = [];
const browser = await launch();
const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const page = await context.newPage();
watch(page, errors);
page.on('requestfailed', (r) => network.push(`failed ${r.url()} ${r.failure()?.errorText ?? ''}`));
page.on('response', (r) => { if (r.status() >= 400) network.push(`${r.status()} ${r.url()}`); });

// Every wait below is on game state (position, clip, prompt), never a fixed duration of key holding:
// the headless software renderer runs at a few frames per second and the game slows down rather
// than teleporting (see MAX_FRAME_SECONDS in Village3D.tsx).
let stepName = 'start';
const step = (name) => { stepName = name; };
const STATE = '[data-testid="three-player-state"]';
// Waits are budgeted in GAME seconds. The game simulates at most 0.1 s per frame, so below
// 10 fps it runs slower than real time; `slowdown` (measured once the scene renders) converts.
const MAX_FRAME_SECONDS = 0.1;
let slowdown = 1;
const budget = (gameSeconds) => Math.max(10_000, Math.round(gameSeconds * 1000 * slowdown * 2));
const clipSeen = (names, gameSeconds = 3) => page.waitForFunction(([sel, wanted]) => {
  const el = document.querySelector(sel);
  const seen = [el?.getAttribute('data-animation'), ...(el?.getAttribute('data-animation-history') ?? '').split('|')];
  return wanted.some((n) => seen.includes(n));
}, [STATE, names], { timeout: budget(gameSeconds) });

/**
 * Hold the virtual joystick towards a point and let go the moment the talk prompt appears — as a
 * player does. The release is done in the page (same frame as the prompt) because the test's
 * own round trips take several slow frames, during which a held stick walks the traveller past.
 */
/** Frames per second right now → how much slower than real time the game runs (≥ 1). */
async function measureSlowdown() {
  const fps = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else resolve(n); };
    requestAnimationFrame(tick);
  }));
  slowdown = Math.max(1, 1 / Math.min(1, Math.max(fps, 0.5) * MAX_FRAME_SECONDS));
  return fps;
}

async function joystickUntilPrompt(toX, toY, promptPattern, gameSeconds) {
  await page.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const observer = new MutationObserver(() => {
      const prompt = [...document.querySelectorAll('.play-world__prompt')].find((b) => re.test(b.textContent ?? ''));
      if (!prompt) return;
      observer.disconnect();
      document.querySelector('.play-world__joystick')?.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, promptPattern.source);
  const stick = page.locator('.play-world__joystick');
  await stick.hover(); // waits until the stick is visible and its layout is stable (after a viewport change)
  const box = await stick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * toX, box.y + box.height * toY, { steps: 7 });
  // The stick reports when it is held; a press that missed it is a test problem, not a game one.
  const engaged = await page.waitForFunction(() => {
    const el = document.querySelector('.play-world__joystick');
    return el?.getAttribute('data-active') === 'true' || document.querySelector('.play-world__prompt');
  }, null, { timeout: 5000 }).then(() => true, () => false);
  if (!engaged) throw new Error(`The joystick press did not register (box ${JSON.stringify(box)})`);
  await page.getByRole('button', { name: promptPattern }).waitFor({ timeout: budget(gameSeconds) });
  await page.mouse.up();
}

try {
  await page.goto(`${BASE}/welcome`);
  await onboard(page, { name: 'Game tester' });
  await page.locator('.w-marker').first().click();
  await page.getByRole('button', { name: /explore the village/i }).click();
  const game = page.getByRole('application');
  await game.waitFor();
  await page.locator('.play-world__three canvas').waitFor({ state: 'visible', timeout: 15000 });
  const playerState = page.getByTestId('three-player-state');
  await playerState.waitFor({ state: 'attached', timeout: 15000 });
  const requiredClips = ['Idle', 'Walk', 'Run', 'WalkStart', 'WalkStop', 'TurnLeft', 'TurnRight', 'Interact'];
  const availableClips = (await playerState.getAttribute('data-animations') ?? '').split('|');
  const missingClips = requiredClips.filter((name) => !availableClips.includes(name));
  if (missingClips.length) throw new Error('GLB is missing animation clips: ' + missingClips.join(', '));
  if (await playerState.getAttribute('data-animation') !== 'Idle') throw new Error('Traveler did not start in the Idle clip');
  await page.waitForFunction(() => { const state = document.querySelector('[data-testid="three-player-state"]'); return state?.getAttribute('data-x') === '220.0' && state?.getAttribute('data-z') === '730.0'; }, null, { timeout: 15000 });
  const initialX = Number(await playerState.getAttribute('data-x'));
  const initialZ = Number(await playerState.getAttribute('data-z'));
  if (Math.abs(initialX - 220) > 20 || Math.abs(initialZ - 730) > 20) throw new Error(`3D spawn did not match the shared Village layout: ${initialX}, ${initialZ}`);
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
  slowdown = Math.max(1, 1 / Math.min(1, Math.max(frameStats.fps, 0.5) * MAX_FRAME_SECONDS));
  step('walk north into the tree collider (A)');
  await game.focus();
  await page.keyboard.down('KeyA');
  await clipSeen(['WalkStart', 'Walk']);
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="three-player-state"]')?.getAttribute('data-z')) <= 630, null, { timeout: budget(3) });
  await page.keyboard.up('KeyA');
  await page.waitForFunction(() => ['WalkStop', 'Idle'].includes(document.querySelector('[data-testid="three-player-state"]')?.getAttribute('data-animation')), null, { timeout: 10000 });
  const firstBlockedZ = Number(await playerState.getAttribute('data-z'));
  // Keep observing for 0.65 s of game time: a blocked traveller must not drift.
  await page.waitForTimeout(Math.round(650 * slowdown));
  const secondBlockedZ = Number(await playerState.getAttribute('data-z'));
  const wallHits = Number(await playerState.getAttribute('data-collisions'));
  const wallFacing = Number(await playerState.getAttribute('data-facing-yaw'));
  if (firstBlockedZ > initialZ - 80 || Math.abs(secondBlockedZ - firstBlockedZ) > 32 || wallHits < 1) throw new Error(`Player did not stop at the tree collider: ${initialZ} → ${firstBlockedZ} → ${secondBlockedZ}; contacts=${wallHits}`);
  if (Math.abs(wallFacing) > 0.45) throw new Error(`Avatar did not turn into its movement direction: yaw=${wallFacing}`);
  if (await page.getByRole('button', { name: /talk to amina/i }).isVisible().catch(() => false)) throw new Error('NPC prompt appeared before reaching Amina');
  step('turn round and walk back south to Amina’s row (D)');
  await page.keyboard.down('KeyD');
  await clipSeen(['TurnLeft', 'TurnRight']);
  // Amina stands at y = 690; walk back until the traveller is on her row, then stop.
  await page.waitForFunction((sel) => Number(document.querySelector(sel)?.getAttribute('data-z')) >= 675, STATE, { timeout: budget(3) });
  await page.keyboard.up('KeyD');
  await page.waitForFunction((sel) => ['WalkStop', 'Idle'].includes(document.querySelector(sel)?.getAttribute('data-animation')), STATE, { timeout: 10000 });
  const rowZ = Number(await playerState.getAttribute('data-z'));
  if (rowZ < 675 || rowZ > 760) throw new Error(`Traveller did not stop near Amina’s row: z=${rowZ}`);
  const sideFacing = Number(await playerState.getAttribute('data-facing-yaw'));
  if (Math.abs(Math.abs(sideFacing) - Math.PI) > 0.5) throw new Error(`Avatar did not rotate during the lateral turn: yaw=${sideFacing}`);
  step('run east to Amina (Shift + W)');
  const aminaPrompt = page.getByRole('button', { name: /talk to amina/i });
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await clipSeen(['Run']);
  await aminaPrompt.waitFor({ timeout: budget(4) }); // ~500 px at running speed
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  const playerYaw = Number(await playerState.getAttribute('data-facing-yaw'));
  if (Math.abs(playerYaw - Math.PI / 2) > 0.45) throw new Error(`Avatar did not face its camera-relative forward direction: yaw=${playerYaw}`);
  step('talk to Amina (E)');
  await page.keyboard.press('e');
  await clipSeen(['Interact']);
  const aminaEnglishDialog = page.getByRole('dialog', { name: 'Amina' });
  await aminaEnglishDialog.getByText(/As-salamu alaykum/i).waitFor();
  // A briefly changing proximity state must never dismiss an opened NPC conversation.
  await page.waitForTimeout(350);
  if (!(await aminaEnglishDialog.isVisible())) throw new Error('Amina dialogue closed unexpectedly after interaction');
  await page.screenshot({ path: 'docs/game/village-3d-en.png' });
  await page.evaluate(axe.source);
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations);
  if (violations.length) throw new Error(`Accessibility violations: ${violations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ')}`);

  step('orbit the camera by dragging');
  await page.getByRole('button', { name: /close/i }).click();
  const cameraBefore = Number(await playerState.getAttribute('data-camera-yaw'));
  const canvasBox = await page.locator('.play-world__three canvas').boundingBox();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 90, canvasBox.y + canvasBox.height / 2 - 25, { steps: 6 });
  await page.mouse.up();
  const rotated = await page.waitForFunction(([sel, before]) => Math.abs(Number(document.querySelector(sel)?.getAttribute('data-camera-yaw')) - before) >= 0.2, [STATE, cameraBefore], { timeout: budget(1) }).then(() => true, () => false);
  if (!rotated) throw new Error('Dragging the scene did not rotate the third-person camera');

  step('Arabic: walk to Amina and talk');
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
  // Budget the walk from the moment the scene is ready, at the frame rate it is running now.
  await page.waitForFunction(() => document.querySelector('[data-testid="three-player-state"]')?.getAttribute('data-x') === '220.0', null, { timeout: 30000 });
  await measureSlowdown();
  await arabicGame.focus();
  const arabicAminaPrompt = page.getByRole('button', { name: /تحدّث مع أمينة/ });
  await page.keyboard.down('ArrowUp');
  await arabicAminaPrompt.waitFor({ timeout: budget(5) }); // ~500 px at walking speed
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'أمينة' }).getByText(/السلام عليكم/).waitFor();
  await page.screenshot({ path: 'docs/game/village-3d-ar.png' });
  await page.evaluate(axe.source);
  const arabicViolations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations);
  if (arabicViolations.length) throw new Error(`Arabic accessibility violations: ${arabicViolations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ')}`);

  step('Arabic: accept Amina’s quest, find the three clues, begin the mission');
  const aminaDialog = page.getByRole('dialog', { name: 'أمينة' });
  await aminaDialog.getByRole('button', { name: /وعليكم السلام/ }).click();
  await aminaDialog.getByRole('button', { name: /التالي/ }).click();
  await aminaDialog.getByRole('button', { name: /اقبل المهمة/ }).click();
  await aminaDialog.waitFor({ state: 'detached' });
  // Arabic UI numbers use Arabic-Indic digits.
  const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  await page.locator('.quest-hud__count').getByText(`وُجد ${arDigit(0)} من ${arDigit(3)} من الأدلة`).waitFor();
  for (let found = 1; found <= 3; found++) {
    await page.getByRole('button', { name: 'ابحث هنا عن دليل' }).first().click();
    // Each find opens a card with what the clue teaches; the player reads it and closes it.
    const card = page.locator('.clue-popup');
    await card.waitFor();
    await card.getByRole('button', { name: 'إغلاق' }).click();
    await card.waitFor({ state: 'detached' });
    if (found < 3) await page.locator('.quest-hud__count').getByText(`وُجد ${arDigit(found)} من ${arDigit(3)} من الأدلة`).waitFor();
  }
  // The in-world ready card is the sole hint; a second floating toast obscures mobile dialogue.
  if (await page.locator('.toasts .toast').filter({ hasText: /وجدت كل الأدلة/ }).count()) {
    throw new Error('Redundant clue-completion toast is obscuring the mission prompt');
  }
  await page.getByRole('button', { name: /ابدأ: كلمات السلام/ }).click();
  await page.waitForURL(/\/mission\/m-words-of-peace/);
  const questState = await page.evaluate(() => JSON.parse(localStorage.getItem('saja:quests:v1') ?? '{}')?.state?.quests?.['q-words-of-peace']);
  if (questState?.status !== 'active' || questState.foundClues?.length !== 3) throw new Error(`Quest progress not saved: ${JSON.stringify(questState)}`);
  step('Arabic: mobile joystick back to Amina');
  await page.goto(BASE);
  await page.locator('.w-marker').first().waitFor();
  await page.locator('.w-marker').first().click();
  await page.getByRole('button', { name: /استكشف القرية/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileState = page.getByTestId('three-player-state');
  await mobileState.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="three-player-state"]')?.getAttribute('data-x') === '220.0', null, { timeout: 15000 });
  await measureSlowdown();
  const mobileStart = Number(await mobileState.getAttribute('data-x'));
  await joystickUntilPrompt(0.5, 0.05, /تحدّث مع أمينة/, 5);
  const mobileEnd = Number(await mobileState.getAttribute('data-x'));
  if (mobileEnd < mobileStart + 280) throw new Error(`3D mobile joystick did not move the player forward: ${mobileStart} → ${mobileEnd}`);
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'أمينة' }).waitFor();
  await page.screenshot({ path: 'docs/game/village-3d-mobile-ar.png' });
  await page.getByRole('dialog', { name: 'أمينة' }).getByRole('button', { name: 'إغلاق' }).click();
  step('courtyard 2D fallback on mobile');
  await page.getByRole('button', { name: /العودة إلى العالم/ }).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('.w-marker').nth(1).click();
  await page.getByRole('button', { name: /استكشف الساحة/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await joystickUntilPrompt(0.18, 0.22, /تحدّث مع الجد يوسف/, 3);
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'الجد يوسف' }).waitFor();
  await page.screenshot({ path: 'docs/game/courtyard-playable.png' });
  const unexpectedErrors = errors;
  if (unexpectedErrors.length) throw new Error(unexpectedErrors.join('\n'));
  console.log('✓ Village 3D: shared spawn, Rapier tree blocking, camera-relative WASD, avatar facing, camera orbit, proximity and mission dialogue');
  console.log('✓ Village 3D: English/Arabic UI, mobile joystick, axe WCAG 2.1 A/AA scans');
  console.log('✓ Quest “Words of Peace”: dialogue → accept → three clues read → mission; progress saved');
  console.log('✓ Courtyard 2D fallback: Arabic mobile joystick movement and NPC dialogue');
  console.log(`  Headless Chrome frame sample (desktop scene): ${frameStats.fps} fps, p50 ${frameStats.p50} ms, p95 ${frameStats.p95} ms, >50 ms ${frameStats.over50ms}`);
} catch (error) {
  // Evidence for the failure: where, what the game state was, what the browser said.
  const shot = `${SHOTS}/game-failure.png`;
  await page.screenshot({ path: shot }).catch(() => {});
  const state = await page.evaluate((sel) => ({ ...document.querySelector(sel)?.dataset }), STATE).catch(() => null);
  const frame = await page.evaluate(() => new Promise((resolve) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else resolve(n); }; requestAnimationFrame(tick); })).catch(() => null);
  console.error(`✗ Game e2e failed at step: ${stepName}`);
  console.error(`  ${error.message.split('\n').filter((line) => line.trim()).slice(0, 12).join('\n  ')}`);
  console.error(`  url: ${page.url()}`);
  console.error(`  player: ${JSON.stringify(state)}`);
  console.error(`  frames in the last second: ${frame}`);
  console.error(`  browser errors: ${JSON.stringify(errors)}`);
  console.error(`  network: ${JSON.stringify(network.slice(-10))}`);
  console.error(`  screenshot: ${shot}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

