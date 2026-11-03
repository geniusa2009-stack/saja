/**
 * HOME = THE WORLD. Not a dashboard: your traveller stands on the path,
 * places sleep or glow, people wait to talk, and the guide speaks in context.
 *
 * Interaction: tap a place to walk there (camera follows), drag or scroll to
 * look around, ←/→ to walk the path, Enter to visit. Everything is also
 * reachable as buttons for keyboard and screen-reader users.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import type { LocationId, WorldLocation } from '@/domain/types';
import { LOCATIONS, LOCATION_BY_ID, CHAPTERS } from '@/content/world';
import { MISSIONS } from '@/content/missions';
import { NPCS } from '@/content/npcs';
import { locationState } from '@/domain/world';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { Button, Chip, IconButton, useReducedMotion } from '@/design-system';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { saveLocation } from '@/api/sync';
import { useConnection } from '@/store/connection';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useJoinedCircleIds } from '@/features/community/live';
import { useTutor } from '@/store/tutor';
import { CIRCLES } from '@/content/community';
import { Character, Avatar } from '@/features/character/Character';
import { useJourney, usePrayerInfo, PRAYER_NAMES, formatDuration } from '@/app/hooks';
import { tutor } from '@/services/tutor';
import { useJourneyContext } from '@/features/tutor/context';
import { FarLayer, GroundLayer, MidLayer, type PlacedLocation } from './scenery';
import { WORLD_H, WORLD_W, mirrorX, pointAtT, tToX } from './geometry';
import { LocationSheet } from './LocationSheet';
import { WorldMapSheet } from './WorldMap';
import { useWorldCommand } from './commands';
import { PlayableWorld } from './PlayableWorld';
import './world.css';

/** How high above the path each place's marker floats (world units). */
const MARKER_LIFT: Record<LocationId, number> = {
  village: 300,
  mosque: 500,
  garden: 320,
  library: 540,
  house: 330,
  market: 290,
  reflection: 250,
  desert: 220,
  mountain: 640,
};

const SKY_STARS = [
  [8, 10],
  [22, 22],
  [36, 7],
  [52, 16],
  [64, 5],
  [78, 20],
  [88, 9],
  [95, 28],
];

function useViewport(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1200, h: typeof window !== 'undefined' ? window.innerHeight : 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width || window.innerWidth, h: e.contentRect.height || window.innerHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function WorldHome() {
  const { t, l, isRTL } = useI18n();
  const navigate = useNavigate();
  const routeState = (useLocation().state ?? {}) as { arrival?: boolean; wake?: LocationId; focus?: LocationId };
  const reduced = useReducedMotion();
  const profile = useProfile((s) => s.profile)!;
  const current = useProgress((s) => s.location);
  const moveTo = useProgress((s) => s.moveTo);
  const focusMode = useSettings((s) => s.focusMode);
  const joined = useJoinedCircleIds();
  const openTutor = useTutor((s) => s.openTutor);
  const journey = useJourney();
  const prayer = usePrayerInfo();
  const ctx = useJourneyContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const { w: vw, h: vh } = useViewport(rootRef);
  const s = vh / WORLD_H; // world unit → px
  const worldPx = WORLD_W * s;
  // Phones: lift the world so the path sits above the compact HUD card; ground continues below.
  const lift = vw < 700 ? vh * 0.2 : 0;
  const maxCam = Math.max(0, worldPx - vw);

  const [walking, setWalking] = useState<LocationId | null>(null);
  const [facing, setFacing] = useState<'left' | 'right'>(isRTL ? 'left' : 'right');
  const [sheetFor, setSheetFor] = useState<LocationId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [talking, setTalking] = useState<{ id: string; line: number } | null>(null);
  const [waking, setWaking] = useState<LocationId | null>(routeState.wake ?? null);
  const [gameScene, setGameScene] = useState<'village' | 'mosque' | null>(null);

  // Player position along the path (t) and the camera (px), both motion values — no re-render per frame.
  const tMV = useMotionValue(LOCATION_BY_ID[current]?.t ?? 0.06);
  const camMV = useMotionValue(0);
  const xpx = (tt: number) => mirrorX(tToX(tt), isRTL) * s;
  const clampCam = useCallback((v: number) => Math.min(maxCam, Math.max(0, v)), [maxCam]);
  const follow = useCallback((tt: number) => camMV.set(clampCam(xpx(tt) - vw * (vw < 700 ? 0.5 : 0.42))), [camMV, clampCam, vw, s, isRTL]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => follow(tMV.get()), [follow, tMV, vw, vh]);

  const trackX = useTransform(camMV, (v) => -v);
  const farX = useTransform(camMV, (v) => -v * 0.3);
  const midX = useTransform(camMV, (v) => -v * 0.62);
  const playerLeft = useTransform(tMV, (tt) => xpx(tt));
  const playerTop = useTransform(tMV, (tt) => pointAtT(tt).y * s + 6 * s);
  useMotionValueEvent(tMV, 'change', (v) => walking && follow(v));

  /* ── places & states ───────────────────────────── */
  const completedSet = useMemo(() => new Set(journey.completed), [journey.completed]);
  const places: PlacedLocation[] = useMemo(
    () => LOCATIONS.map((loc) => ({ id: loc.id, t: loc.t, asleep: !journey.unlocked.has(loc.id) || waking === loc.id, justWoke: waking === loc.id })),
    [journey.unlocked, waking],
  );
  const furthestOpen = Math.max(...LOCATIONS.filter((x) => journey.unlocked.has(x.id) && x.id !== waking).map((x) => x.t));
  const litT = Math.min(1, (tToX(furthestOpen) + 60) / WORLD_W);
  const hintLoc = journey.next ? LOCATION_BY_ID[journey.next.mission.location] : undefined;

  // A place that just woke: show it asleep for a beat, then let it wake while the camera looks at it.
  useEffect(() => {
    if (!waking) return;
    const loc = LOCATION_BY_ID[waking];
    animate(camMV, clampCam(xpx(loc.t) - vw / 2), { duration: reduced ? 0 : 1.4, ease: [0.22, 0.61, 0.21, 1] });
    const id = window.setTimeout(() => setWaking(null), reduced ? 50 : 1200);
    window.history.replaceState({}, '');
    return () => window.clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── walking ───────────────────────────────────── */
  const walkTo = useCallback(
    (id: LocationId, then?: () => void) => {
      const target = LOCATION_BY_ID[id];
      const from = tMV.get();
      const dist = Math.abs(target.t - from);
      setTalking(null);
      if (dist < 0.005) {
        moveTo(id);
        saveLocation(id);
        if (then) then();
        else setSheetFor(id);
        return;
      }
      const forward = target.t > from;
      setFacing(forward !== isRTL ? 'right' : 'left');
      setWalking(id);
      animate(tMV, target.t, {
        duration: reduced ? 0 : Math.min(3.4, Math.max(0.8, dist * 9)),
        ease: [0.45, 0.05, 0.35, 1],
        onUpdate: (v) => follow(v),
        onComplete: () => {
          setWalking(null);
          moveTo(id);
          saveLocation(id);
          if (then) then();
          else setSheetFor(id);
        },
      });
    },
    [tMV, isRTL, reduced, follow, moveTo],
  );

  // Arriving from the map / a celebration with a place to focus.
  useEffect(() => {
    if (routeState.focus) walkTo(routeState.focus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const walkCmd = useWorldCommand((s) => s.walk);
  const consumeCmd = useWorldCommand((s) => s.consume);
  useEffect(() => {
    if (!walkCmd) return;
    consumeCmd();
    walkTo(walkCmd);
  }, [walkCmd, consumeCmd, walkTo]);

  const order = LOCATIONS.map((x) => x.id);
  const step = useCallback(
    (dir: 1 | -1) => {
      if (walking) return;
      const i = order.indexOf(current);
      const next = order[Math.min(order.length - 1, Math.max(0, i + dir))];
      if (next !== current) walkTo(next, () => undefined);
    },
    [walking, order, current, walkTo],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameScene) return;
      if (sheetFor || mapOpen || (e.target as HTMLElement)?.closest?.('input,textarea,[role="dialog"]')) return;
      if (e.key === 'ArrowRight') step(isRTL ? -1 : 1);
      else if (e.key === 'ArrowLeft') step(isRTL ? 1 : -1);
      else if (e.key === 'Enter' && document.activeElement === document.body) setSheetFor(current);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, isRTL, current, sheetFor, mapOpen, gameScene]);

  /* ── look around: drag & wheel ─────────────────── */
  const drag = useRef<{ x: number; cam: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a,.hud-card')) return;
    drag.current = { x: e.clientX, cam: camMV.get(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    camMV.set(clampCam(drag.current.cam - dx));
  };
  const onPointerUp = () => (drag.current = null);
  const onWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    camMV.set(clampCam(camMV.get() + d));
  };

  /* ── HUD content ───────────────────────────────── */
  const greeting = useMemo(() => (ctx ? tutor.greet(ctx) : null), [ctx]);
  const here = LOCATION_BY_ID[current];
  const chapter = CHAPTERS.find((c) => c.n === here.chapter) ?? CHAPTERS[0];
  const next = journey.next?.mission;
  const myCircle = CIRCLES.find((c) => joined.includes(c.id));
  const liveMode = useConnection((s) => s.status === 'online');
  const prayerLabel = prayer.next.inMinutes <= 1 ? t('world.prayerNow', { prayer: l(PRAYER_NAMES[prayer.next.name]) }) : t('world.prayerIn', { prayer: l(PRAYER_NAMES[prayer.next.name]), time: formatDuration(prayer.next.inMinutes, t) });

  const continueJourney = () => {
    if (!next) return setMapOpen(true);
    if (next.location === current) navigate(`/mission/${next.id}`);
    else walkTo(next.location, () => navigate(`/mission/${next.id}`));
  };

  const npcs = NPCS.filter((n) => journey.unlocked.has(n.at));
  const H = vh;

  return (
    <div
      ref={rootRef}
      className="world"
      data-phase={prayer.phase}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      aria-label={t('world.map')}
    >
      <div className="w-sky" aria-hidden>
        <div className="w-moon" />
        {SKY_STARS.map(([x, y], i) => (
          <span key={i} className="w-skystar" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} />
        ))}
      </div>
      <div className="w-horizon-glow" aria-hidden />

      <div className="w-underground" style={{ height: lift + vh * 0.12 }} aria-hidden />
      <motion.div className="w-track" style={{ x: farX, width: worldPx, top: -H * 0.04 - lift }} aria-hidden>
        <FarLayer />
      </motion.div>
      <motion.div className="w-track" style={{ x: midX, width: worldPx, top: -lift }} aria-hidden>
        <MidLayer />
      </motion.div>

      <motion.div className="w-track" style={{ x: trackX, width: worldPx, top: -lift }}>
        <GroundLayer places={places} litT={isRTL ? litT : litT} mirror={isRTL} />

        {hintLoc && hintLoc.id !== current && journey.unlocked.has(hintLoc.id) && (
          <span className="w-hint-star" style={{ left: xpx(hintLoc.t), top: (pointAtT(hintLoc.t).y - MARKER_LIFT[hintLoc.id] - 90) * s }}>
            <Star size={20} color="currentColor" />
          </span>
        )}

        {npcs.map((n) => {
          const loc = LOCATION_BY_ID[n.at];
          const x = mirrorX(tToX(loc.t) + n.dx, isRTL);
          const y = pointAtT(loc.t).y - 26;
          const open = talking?.id === n.id;
          return (
            <button
              key={n.id}
              type="button"
              className="w-actor w-npc"
              style={{ left: x * s, top: y * s }}
              aria-label={`${l(n.name)}: ${l(n.lines[0])}`}
              onClick={() => setTalking((cur) => (cur?.id === n.id ? (cur.line + 1 < n.lines.length ? { id: n.id, line: cur.line + 1 } : null) : { id: n.id, line: 0 }))}
            >
              {open && (
                <motion.span className="w-bubble" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status">
                  <strong>{l(n.name)}</strong>
                  {l(n.lines[talking!.line])}
                </motion.span>
              )}
              <Character look={n.look} size={Math.max(44, 118 * s)} facing={n.dx > 0 !== isRTL ? 'left' : 'right'} pose={open ? 'wave' : 'idle'} expression={open ? 'happy' : 'calm'} />
            </button>
          );
        })}

        <motion.div className="w-actor w-player" style={{ left: playerLeft, top: playerTop }}>
          <span className="w-player-light" />
          <Character look={profile.look} size={Math.max(52, 132 * s)} walking={!!walking} facing={facing} pose={routeState.arrival && !walking ? 'wave' : 'idle'} expression={walking ? 'calm' : 'happy'} title={profile.name} />
        </motion.div>

        {LOCATIONS.map((loc) => (
          <Marker
            key={loc.id}
            loc={loc}
            x={xpx(loc.t)}
            y={(pointAtT(loc.t).y - MARKER_LIFT[loc.id]) * s}
            state={waking === loc.id ? 'asleep' : locationState(loc, { completed: journey.completed }, MISSIONS, current)}
            open={MISSIONS.filter((m) => m.location === loc.id && !completedSet.has(m.id)).length}
            onSelect={() => walkTo(loc.id)}
          />
        ))}
      </motion.div>

      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="w-firefly" aria-hidden style={{ left: `${15 + i * 22}%`, bottom: `${14 + (i % 2) * 9}%`, animationDelay: `${i * 1.7}s` }} />
      ))}

      {/* ── HUD ─────────────────────────────────── */}
      <div className="hud">
        <div className="hud-top">
          <div className="hud-greet">
            <span className="hud-greet__hello">{t('world.greeting')}</span>
            <span className="hud-greet__name">{profile.name}</span>
            <button type="button" className="hud-pill" onClick={() => navigate('/day')}>
              <Icon name="day" size={15} />
              {prayerLabel}
            </button>
          </div>
          <div className="hud-actions">
            <span className="hud-lanterns" title={t('world.lanterns', { n: journey.lanterns, total: journey.total })}>
              <Icon name="lantern" size={18} />
              <span aria-hidden>
                {journey.lanterns}/{journey.total}
              </span>
              <span className="sr-only">{t('world.lanterns', { n: journey.lanterns, total: journey.total })}</span>
            </span>
            <IconButton icon="map" label={t('world.map')} tone="glass" onClick={() => setMapOpen(true)} />
            <button type="button" className="hide-desktop" onClick={() => navigate('/profile')} aria-label={t('nav.profile')} style={{ display: 'grid' }}>
              <Avatar look={profile.look} size={40} />
            </button>
          </div>
        </div>

        <div className="hud-bottom">
          <div className="hud-chips">
            {focusMode && (
              <Chip icon="focus" className="hud-focus">
                {t('day.focusOn')}
              </Chip>
            )}
            {!focusMode &&
              (myCircle ? (
                <Chip icon="community" onClick={() => navigate(`/circles/${myCircle.id}`)}>
                  {/* Live: no invented numbers — the weekly goal figures are sample data. */}
                  {liveMode ? t('world.circleOpen', { name: l(myCircle.name) }) : t('world.circleNudge', { n: myCircle.weeklyGoal.current })}
                </Chip>
              ) : journey.completed.length > 0 ? (
                <Chip icon="community" onClick={() => navigate('/circles')}>
                  {t('world.findCircle')}
                </Chip>
              ) : null)}
          </div>
          <motion.section className="hud-card" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 0.61, 0.21, 1] }} aria-label={l(here.name)}>
            <div className="hud-card__chapter">
              <span className="t-caption gold">{t('world.chapter', { n: chapter.n })}</span>
              <span className="hud-card__title">{l(here.name)}</span>
            </div>
            {greeting && (
              <div className="hud-siraj">
                <span className="hud-siraj__light" aria-hidden>
                  <Star size={14} color="currentColor" />
                </span>
                <p>
                  <span className="sr-only">{t('world.siraj')}: </span>
                  {greeting.text}
                </p>
              </div>
            )}
            <div className="row wrap">
              <Button iconEnd="forward" onClick={continueJourney} disabled={!!walking}>
                {journey.completed.length === 0 ? t('a.begin') : t('a.continueJourney')}
              </Button>
              {next && (
                <span className="muted t-small hud-next">
                  {t('m.number', { n: next.number })} · {l(next.title)}
                </span>
              )}
              <span className="spacer" />
              <Button variant="ghost" size="sm" icon="star" onClick={() => openTutor(greeting?.knowledgeId)}>
                {t('world.askSiraj')}
              </Button>
            </div>
          </motion.section>
        </div>
        <p className="hud-kbd" aria-hidden>
          {t('world.keyboardHint')}
        </p>
      </div>

      <LocationSheet id={sheetFor} onClose={() => setSheetFor(null)} completed={completedSet} unlocked={journey.unlocked} onExplore={(id) => { setSheetFor(null); setGameScene(id); }} />
      <WorldMapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        current={current}
        onTravel={(id) => {
          setMapOpen(false);
          walkTo(id);
        }}
      />
      {gameScene && <PlayableWorld sceneId={gameScene} look={profile.look} playerName={profile.name} rtl={isRTL} reducedMotion={reduced} onExit={() => setGameScene(null)} />}
    </div>
  );
}

function Marker({ loc, x, y, state, open, onSelect }: { loc: WorldLocation; x: number; y: number; state: 'done' | 'current' | 'open' | 'asleep'; open: number; onSelect: () => void }) {
  const { t, l } = useI18n();
  const icon = state === 'done' ? 'check' : state === 'asleep' ? 'moon' : state === 'current' ? 'star' : 'lantern';
  return (
    <button
      type="button"
      className="w-marker"
      data-state={state}
      style={{ left: x, top: y }}
      onClick={onSelect}
      aria-label={`${l(loc.name)} — ${state === 'asleep' ? t('world.asleep') : state === 'done' ? t('m.completed') : t('world.walkTo', { place: l(loc.name) })}`}
    >
      <span className="w-marker__arch">
        <Icon name={icon} size={20} />
        {state !== 'asleep' && state !== 'done' && open > 0 && <span className="w-marker__count">{open}</span>}
      </span>
      <span className="w-marker__label">{state === 'asleep' ? `${l(loc.name)} · ${t('world.asleep')}` : l(loc.name)}</span>
    </button>
  );
}
