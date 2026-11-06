/** Shared helpers for SAJA end-to-end journeys (drives the installed Chrome; no browser download). */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

export const BASE = process.env.SAJA_URL ?? `http://localhost:${process.env.E2E_PORT ?? 8899}`;
export const SHOTS = process.env.SAJA_SHOTS ?? 'e2e/screenshots';
mkdirSync(SHOTS, { recursive: true });

export async function launch() {
  return chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] });
}

export function watch(page, errors) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|403|404|409|422|429)/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
}

let step = 0;
export async function check(name, fn) {
  step++;
  try {
    await fn();
    console.log(`✓ ${String(step).padStart(2)} ${name}`);
  } catch (e) {
    console.log(`✗ ${String(step).padStart(2)} ${name}\n     ${e.message.split('\n').slice(0, process.env.E2E_VERBOSE ? 6 : 1).join('\n     ')}`);
    process.exitCode = 1;
  }
}

export async function onboard(page, { band = /18 or older/i, name = 'Maryam', locale = 'en' } = {}) {
  await page.goto(`${BASE}/welcome`);
  await page.getByRole('button', { name: locale === 'ar' ? 'ابدأ' : /begin/i }).click({ timeout: 15000 });
  // The footer holds the single forward action of each step (Continue / I'm the guardian / Enter the world).
  const next = async () => {
    await page.locator('.ob-foot button').last().click();
    await page.waitForTimeout(800); // let the step transition finish before touching the next step
  };
  await page.getByRole('radio').first().click();
  await next();
  await page.getByRole('radio', { name: band }).click();
  await next();
  await page.waitForTimeout(400);
  if (!(await page.getByRole('radio').first().isVisible().catch(() => false))) await next(); // the guardian step for children
  await page.getByRole('radio').first().click();
  await next();
  await page.getByRole('checkbox').first().click();
  await next();
  await page.getByRole('radio').first().click();
  await next();
  await page.getByLabel(locale === 'ar' ? /اسمك/ : /your name/i).fill(name);
  await page.getByRole('button', { name: locale === 'ar' ? /ادخل العالم/ : /enter the world/i }).click();
  await page.waitForURL(`${BASE}/`);
}
