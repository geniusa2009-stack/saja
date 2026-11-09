/** Integration acceptance for personalised learning and original world access. */
import { BASE, launch, onboard, watch } from './lib.mjs';

const browser = await launch();
const errors = [];
try {
  const adultContext = await browser.newContext({ locale: 'en-GB', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const adult = await adultContext.newPage();
  watch(adult, errors);

  await onboard(adult, { name: 'Integration reviewer', purposeIndex: 2, landing: 'native' });
  if (new URL(adult.url()).pathname !== '/home') throw new Error('Adult onboarding did not reach the personalised home');
  await adult.getByRole('heading', { name: 'Welcome, Integration reviewer' }).waitFor();

  await adult.getByRole('link', { name: 'Browse all content' }).click();
  await adult.getByRole('heading', { name: 'The SAJA content catalogue' }).waitFor();
  await adult.getByRole('combobox', { name: 'Subject' }).selectOption('world');
  if (await adult.locator('.exph-card').count() < 1) throw new Error('World/stories category is empty');

  await adult.goto(`${BASE}/profile#experience`);
  await adult.getByRole('heading', { name: 'Personalise my experience' }).waitFor();
  await adult.getByRole('checkbox', { name: 'Fictional stories' }).check();
  await adult.goto(`${BASE}/home`);
  await adult.getByRole('link', { name: 'Stories', exact: true }).waitFor();
  await adult.reload();
  await adult.getByRole('link', { name: 'Stories', exact: true }).waitFor();
  await adultContext.close();

  const childContext = await browser.newContext({ locale: 'ar-EG', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const child = await childContext.newPage();
  watch(child, errors);
  await onboard(child, { locale: 'ar', band: 'أقل من ١٣', name: 'مراجعة سجى', landing: 'native' });
  if (new URL(child.url()).pathname !== '/') throw new Error('Child onboarding should start in the age-appropriate world');
  await child.goto(`${BASE}/catalog`);
  await child.locator('.expc-count').waitFor();
  if (await child.locator('a.exph-card[href="/scholar"]').count()) throw new Error('Adult-only scholar link appeared in child catalogue');
  await childContext.close();

  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
  console.log('✓ SAJA integration: adult home, catalogue, persisted choices and child-safe discovery');
} finally {
  await browser.close();
}
