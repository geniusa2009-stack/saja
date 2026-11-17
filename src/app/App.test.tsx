import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import { DEFAULT_LOOK } from '@/features/character/palette';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const traveller = () =>
  useProfile.getState().setProfile({
    name: 'Yusuf',
    look: DEFAULT_LOOK,
    purpose: 'new-muslim',
    ageBand: 'adult',
    level: 'beginner',
    goals: ['prayer'],
    interests: ['prayer'],
    modality: 'hands-on',
    createdAt: Date.now(),
  });

beforeEach(() => {
  sessionStorage.setItem('saja:intro-played', '1'); // replay prevention: no intro in tests
  localStorage.clear();
  useSettings.setState({ locale: 'en' });
  useProfile.getState().reset();
  useProgress.getState().reset();
});
afterEach(cleanup);

describe('SAJA app', () => {
  it('sends a new traveller to onboarding', async () => {
    renderAt('/');
    expect(await screen.findByText('Welcome to your journey.', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('returns an existing adult learner to the personalised home', async () => {
    traveller();
    renderAt('/welcome');
    expect(await screen.findByRole('heading', { name: 'Welcome, Yusuf' })).toBeInTheDocument();
  });

  it('keeps an existing child learner in the age-appropriate world', async () => {
    traveller();
    const existing = useProfile.getState().profile!;
    useProfile.getState().setProfile({ ...existing, ageBand: 'child', purpose: 'child' });
    renderAt('/welcome');
    // WorldHome is a lazy-loaded route with a large 3D feature bundle.
    expect((await screen.findAllByText('The Village', {}, { timeout: 10000 })).length).toBeGreaterThan(0);
    expect(useProfile.getState().profile?.ageBand).toBe('child');
  }, 15000);

  it('walks adult onboarding into the personalised home', async () => {
    const user = userEvent.setup();
    renderAt('/welcome');
    await user.click(await screen.findByRole('button', { name: /begin/i }, { timeout: 4000 }));
    await user.click(await screen.findByRole('radio', { name: /new to islam/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('radio', { name: /18 or older/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('radio', { name: /just starting/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('checkbox', { name: /learning to pray/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('radio', { name: /by doing/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText('Here is your path — you can change it later')).toBeInTheDocument();
    expect(await screen.findByText('The Water Path')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(await screen.findByLabelText(/your name/i), 'Maryam');
    await user.click(screen.getByRole('button', { name: /enter the world/i }));
    expect(await screen.findByRole('heading', { name: 'Welcome, Maryam' }, { timeout: 8000 })).toBeInTheDocument();
    expect(useProfile.getState().profile?.name).toBe('Maryam');
  }, 15000);

  const ROUTES: [string, RegExp][] = [
    ['/', /The Village/],
    ['/home', /Welcome,/],
    ['/catalog', /The SAJA content catalogue/],
    ['/journey', /Your path so far/],
    ['/learn', /Knowledge with its sources/],
    ['/hadith', /Words that stayed/],
    ['/hadith/h-bukhari-1', /Actions and intentions/],
    ['/hadith/discover', /Learning by exploring/],
    ['/hadith/discover/scenario-new-neighbour', /The new neighbour/],
    ['/day', /Prayer times/],
    ['/circles', /Learning Circles/],
    ['/circles/first-steps', /First Steps Circle/],
    ['/scholar', /Real questions deserve qualified people/],
    ['/explore', /Wander the world/],
    ['/profile', /Knowledge/],
    ['/profile/memory', /What SAJA remembers/],
    ['/amanah', /a seal kept in trust/],
    ['/nour', /Check something you saw or heard/],
    ['/mission/m-water-path', /The Water Path/],
    ['/mission/m-summit-names', /still asleep/],
    ['/nowhere', /doesn’t lead anywhere yet/],
    ['/inbox', /Notifications need the SAJA server/],
    ['/staff', /Staff only/],
    ['/account', /Accounts need the SAJA server/],
    ['/account/reset', /Choose a new password/],
    ['/messages', /Private messages need the SAJA server/],
  ];

  it.each(ROUTES)('renders %s', { timeout: 12000 }, async (path, text) => {
    traveller();
    renderAt(path);
    expect((await screen.findAllByText(text, {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    // The error boundary must never be what matched.
    expect(screen.queryByText('Something went quiet')).toBeNull();
  });

  it('shows a journey in progress on the profile and journey pages', async () => {
    traveller();
    useProgress.getState().complete(
      { missionId: 'm-water-path', completedAt: Date.now(), mistakes: 3, hintsUsed: 1, durationMs: 90000, mechanic: 'wudu-journey', modality: 'visual' },
      { id: 'keeper-of-wudu', kind: 'artifact', at: Date.now(), missionId: 'm-water-path' },
      true,
    );
    useProgress.getState().unlockPlace('garden');
    useProgress.getState().addReflection(['A warm dinner']);
    renderAt('/profile');
    expect((await screen.findAllByText('Keeper of Wudu', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.getByText('A warm dinner')).toBeInTheDocument();
    expect(screen.queryByText('Something went quiet')).toBeNull();
    cleanup();
    renderAt('/journey');
    expect((await screen.findAllByText('Keeper of Wudu', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Something went quiet')).toBeNull();
  }, 15000);

  const AR_ROUTES: [string, string][] = [
    ['/hadith', 'كلمات باقية'],
    ['/hadith/h-bukhari-1', 'الأعمال والنيات'],
    ['/circles', 'حلقات التعلم'],
    ['/scholar', 'اسأل عالمًا'],
    ['/nour', 'تحقّق من شيء رأيته أو سمعته.'],
    ['/amanah', 'تحقق المحتوى — ختم محفوظ بأمانة.'],
    ['/profile/memory', 'ماذا تتذكر سجى'],
    ['/inbox', 'الإشعارات تحتاج إلى خادم سجى'],
    ['/account', 'الحسابات تحتاج إلى خادم سجى'],
    ['/messages', 'الرسائل الخاصة تحتاج إلى خادم سجى'],
  ];

  it.each(AR_ROUTES)('renders %s in Arabic', { timeout: 12000 }, async (path, text) => {
    traveller();
    useSettings.setState({ locale: 'ar' });
    renderAt(path);
    expect((await screen.findAllByText(text, {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Something went quiet')).toBeNull();
    expect(screen.queryByText('هدأ شيء ما')).toBeNull();
  });

  it('never shows sample scholars as verified (offline demo)', async () => {
    traveller();
    renderAt('/scholar');
    expect((await screen.findAllByText('Sample · not verified', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Verified scholar')).toBeNull();
  });

  it('labels offline demo mode honestly', async () => {
    traveller();
    renderAt('/profile');
    expect((await screen.findAllByText('Offline demo', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
  });

  it('renders Arabic right-to-left', async () => {
    traveller();
    useSettings.setState({ locale: 'ar' });
    renderAt('/day');
    expect((await screen.findAllByText('مواقيت الصلاة', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
