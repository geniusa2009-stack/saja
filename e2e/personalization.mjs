/** Browser acceptance: the same user choices must produce different real first missions. */
import { BASE, launch, onboard, watch } from './lib.mjs';

const browser = await launch();
const errors = [];
const scenarios = [
  { purposeIndex: 0, label: 'Explore Islam', nextMission: 'Words of Peace' },
  { purposeIndex: 1, label: 'Your new beginning', nextMission: 'The Water Path' },
];
try {
  for (const [i, scenario] of scenarios.entries()) {
    const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    watch(page, errors);
    await onboard(page, { name: `Journey tester ${i + 1}`, purposeIndex: scenario.purposeIndex });
    await page.getByText(scenario.label, { exact: true }).waitFor({ timeout: 10_000 });
    const next = await page.locator('.hud-next').innerText();
    if (!next.includes(scenario.nextMission)) throw new Error(`${scenario.label}: expected ${scenario.nextMission}, got ${next}`);
    await page.goto(`${BASE}/journey`);
    await page.getByText('Keep the learning connected').waitFor();
    const links = await page.locator('.saja-nextsteps__card').count();
    if (links < 2) throw new Error(`${scenario.label} has fewer than two connected learning links`);
    await context.close();
  }
  if (errors.length) throw new Error(errors.slice(0, 4).join(' | '));
  console.log('✓ Distinct onboarding paths, recommendations, and connected resources');
} finally {
  await browser.close();
}
