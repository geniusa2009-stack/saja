import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useDocumentLocale, useI18n } from '@/i18n';
import { EASE, StarLoader, Toasts, useReducedMotion } from '@/design-system';
import { CinematicIntro } from '@/features/intro/CinematicIntro';
import { lazyWithPreload, whenIdle } from './lazyPreload';
import { useProfile } from '@/store/profile';
import { decideIntro, markIntroPlayed, useIntro } from './intro';
import { ErrorBoundary } from './ErrorBoundary';
import { RestScreen } from '@/features/account/RestScreen';
import { bootstrap, onReconnect, onServerEvent, watchProfile } from '@/api/sync';
import { translate } from '@/i18n';
import { toast } from '@/design-system';
import { useConnection } from '@/store/connection';
import { useSettings } from '@/store/settings';
import type { ServerNotification } from '@/api/types';
import { daySync } from '@/api/daySync';
import { useDay } from '@/store/day';
import { isOnline } from '@/store/connection';
import { setTutorConnectivity } from '@/services/tutor';

setTutorConnectivity(isOnline);
import { Nav } from './Nav';

// Route-level code splitting: the world, missions and each area load on demand.
const WorldHome = lazyWithPreload(() => import('@/features/world/WorldHome'));
const Onboarding = lazy(() => import('@/features/onboarding/Onboarding'));
const MissionRunner = lazyWithPreload(() => import('@/features/missions/MissionRunner'));
const Journey = lazy(() => import('@/features/journey/Journey'));
const Learn = lazy(() => import('@/features/learn/Learn'));
const HadithLibrary = lazy(() => import('@/features/hadith/HadithLibrary'));
const HadithDetail = lazy(() => import('@/features/hadith/HadithDetail'));
const HadithDiscover = lazy(() => import('@/features/hadith/Discover'));
const HadithActivityPlayer = lazy(() => import('@/features/hadith/ActivityPlayer'));
const MyDay = lazy(() => import('@/features/day/MyDay'));
const Circles = lazy(() => import('@/features/community/Circles'));
const CircleRoom = lazy(() => import('@/features/community/CircleRoom'));
const Scholar = lazy(() => import('@/features/scholar/AskScholar'));
const Explore = lazy(() => import('@/features/explore/Explore'));
const Profile = lazy(() => import('@/features/profile/Profile'));
const Memory = lazy(() => import('@/features/profile/Memory'));
const Amanah = lazy(() => import('@/features/trust/Amanah'));
const Nour = lazy(() => import('@/features/trust/Nour'));
const NotFound = lazy(() => import('./NotFound'));
const Account = lazy(() => import('@/features/account/Account'));
const ResetPassword = lazy(() => import('@/features/account/Account').then((m) => ({ default: m.ResetPassword })));
const Inbox = lazy(() => import('@/features/account/Inbox'));
const Staff = lazy(() => import('@/features/staff/Staff'));
const Messages = lazy(() => import('@/features/community/Messages'));
const QuranOdyssey = lazy(() => import('@/features/quran/QuranOdyssey'));
const SirajLayer = lazy(() => import('@/features/tutor/SirajLayer'));
const CelebrationLayer = lazy(() => import('@/features/world/CelebrationLayer'));

function RouteLoader() {
  const { t } = useI18n();
  return (
    <div style={{ minHeight: '60dvh', display: 'grid', placeItems: 'center' }}>
      <StarLoader label={t('state.loading')} />
    </div>
  );
}

/** Everyone needs a traveller before entering the world. */
function RequireProfile() {
  const profile = useProfile((s) => s.profile);
  if (!profile) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

function Shell() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip.content')}
      </a>
      <Nav />
      <main id="main" className="shell-main" tabIndex={-1}>
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Suspense fallback={null}>
        <SirajLayer />
        <CelebrationLayer />
      </Suspense>
      {/* Guardian time limit reached: new experiences pause; journey, profile and inbox stay readable. */}
      {!/^\/(journey|profile|inbox|account|messages)/.test(pathname) && <RestScreen />}
    </>
  );
}

export function App() {
  useDocumentLocale();
  const reduced = useReducedMotion();
  const introMode = useIntro((s) => s.mode);
  const setIntro = useIntro((s) => s.set);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  useEffect(() => {
    setIntro(decideIntro());
    setBooted(true);
  }, [setIntro]);

  // The world and missions are the core loop: load both in the background so moving between them never shows a loader.
  useEffect(() => {
    whenIdle(() => {
      WorldHome.preload();
      MissionRunner.preload();
    });
  }, []);

  // Connect to the SAJA server if there is one; otherwise the app stays in offline demo mode.
  useEffect(() => {
    void bootstrap();
    const offProfile = watchProfile();
    // Live notifications: a gentle toast and the inbox count — never a modal interruption.
    const offNote = onServerEvent('notification', (e) => {
      const n = (e as { notification: ServerNotification }).notification;
      // A place waking up has its own moment in the world (reward chip + unlock scene); a toast on top would cover it.
      if (n.category !== 'unlock') toast(n.title[useSettings.getState().locale]);
      useConnection.getState().set({ unread: useConnection.getState().unread + 1 });
    });
    // Prayer place/method and schedule preferences are mirrored whenever they change (server honours memory settings).
    const offPlace = useSettings.subscribe((s, prev) => {
      if (s.prayerPlace !== prev.prayerPlace || s.method !== prev.method || s.asr !== prev.asr) daySync.prayerPlace(s.prayerPlace, s.method, s.asr);
    });
    const offPrefs = useDay.subscribe((s, prev) => {
      if (s.prefs !== prev.prefs) daySync.prefs(s.prefs);
    });
    const offReconnect = onReconnect(() => toast(translate(useSettings.getState().locale, 'sys.reconnected')));
    return () => {
      offReconnect();
      offProfile();
      offNote();
      offPlace();
      offPrefs();
    };
  }, []);

  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={{ ease: EASE }}>
      {booted && introMode && (
        <CinematicIntro
          mode={introMode}
          onDone={() => {
            markIntroPlayed();
            setIntro(null);
          }}
        />
      )}
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/reset" element={<ResetPassword />} />
            <Route element={<RequireProfile />}>
              <Route path="/mission/:id" element={<MissionRunner />} />
              <Route element={<Shell />}>
                <Route index element={<WorldHome />} />
                <Route path="journey" element={<Journey />} />
                <Route path="learn" element={<Learn />} />
                <Route path="quran" element={<QuranOdyssey />} />
                <Route path="quran/:surahId" element={<QuranOdyssey />} />
                <Route path="quran-studio" element={<QuranOdyssey />} />
                <Route path="hadith" element={<HadithLibrary />} />
                <Route path="hadith/discover" element={<HadithDiscover />} />
                <Route path="hadith/discover/:activityId" element={<HadithActivityPlayer />} />
                <Route path="hadith/:id" element={<HadithDetail />} />
                <Route path="day" element={<MyDay />} />
                <Route path="circles" element={<Circles />} />
                <Route path="circles/:id" element={<CircleRoom />} />
                <Route path="scholar" element={<Scholar />} />
                <Route path="explore" element={<Explore />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/memory" element={<Memory />} />
                <Route path="amanah" element={<Amanah />} />
                <Route path="nour" element={<Nour />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:id" element={<Messages />} />
                <Route path="staff/*" element={<Staff />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toasts />
    </MotionConfig>
  );
}
