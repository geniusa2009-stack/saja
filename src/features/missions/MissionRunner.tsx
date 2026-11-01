/**
 * Mission runner — WORLD → LOCATION → MISSION → INTERACTION → KNOWLEDGE → PROGRESS.
 *
 * Observes learning signals (mistakes, streaks of mistakes, hesitation, hints)
 * and, instead of repeating what isn't working, changes *how* the concept is
 * taught: hands-on → illustrated / story → guided retry with Siraj.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { L10n, LocationId, Modality, MissionResult } from '@/domain/types';
import { MISSION_BY_ID, MISSIONS } from '@/content/missions';
import { LOCATIONS, LOCATION_BY_ID } from '@/content/world';
import { getKnowledge } from '@/content/knowledge';
import { chooseAdaptation, isHesitating, isStruggling, type Adaptation, type MissionRunState } from '@/domain/adaptive';
import { isUnlocked, newlyUnlocked } from '@/domain/world';
import { Button, Dialog, EmptyState, IconButton, StarLoader, toast, useReducedMotion } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { useLearner } from '@/store/learner';
import { useProgress } from '@/store/progress';
import { useProfile } from '@/store/profile';
import { useTutor } from '@/store/tutor';
import { Character } from '@/features/character/Character';
import { EvidencePanel } from '@/features/trust/EvidencePanel';
import { CharacterPreview } from '@/features/character/CharacterCreator';
import { useJourney } from '@/app/hooks';
import { MissionSync, saveLocation } from '@/api/sync';
import { useMissionDefinition } from '@/api/content';
import { MECHANICS } from './registry';
import type { InteractionType } from '@/domain/missionDefinitions';
import { MissionPayloadProvider } from './payload';
import { RestScreen } from '@/features/account/RestScreen';
import { useTimeLimited } from '@/store/connection';
import type { MechanicProps } from './types';
import './mission.css';

const VisualExplainer = lazy(() => import('./mechanics/VisualExplainer'));
const StoryMode = lazy(() => import('./mechanics/StoryMode'));

type Phase = 'intro' | 'play' | 'done';

const ADAPTABLE = new Set(['wudu-journey', 'salah-path', 'lantern-match', 'clue-hunt']);

export default function MissionRunner() {
  const { id = '' } = useParams();
  const mission = MISSION_BY_ID[id];
  const { t } = useI18n();
  const navigate = useNavigate();
  const journey = useJourney();

  if (!mission) {
    return (
      <div className="mission mission--empty">
        <EmptyState icon="compass" title={t('m.notFound')} action={<Button onClick={() => navigate('/')}>{t('m.backToWorld')}</Button>} />
      </div>
    );
  }
  if (!journey.unlocked.has(mission.location)) {
    return (
      <div className="mission mission--empty">
        <EmptyState icon="moon" title={t('m.lockedTitle')} body={t('m.lockedBody')} action={<Button onClick={() => navigate('/')}>{t('m.backToWorld')}</Button>} />
      </div>
    );
  }
  return <Run key={mission.id} missionId={mission.id} />;
}

function Run({ missionId }: { missionId: string }) {
  const mission = MISSION_BY_ID[missionId];
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const profile = useProfile((s) => s.profile)!;
  const model = useLearner((s) => s.model);
  const signal = useLearner((s) => s.signal);
  const complete = useProgress((s) => s.complete);
  const results = useProgress((s) => s.results);
  const pushCelebration = useProgress((s) => s.pushCelebration);
  const unlockPlace = useProgress((s) => s.unlockPlace);
  const moveTo = useProgress((s) => s.moveTo);
  const openTutor = useTutor((s) => s.openTutor);

  const startModality: Modality = mission.mechanic === 'kindness-choice' || mission.mechanic === 'reflection' ? mission.modality : model.preferred === 'guided' ? 'guided' : 'hands-on';
  const [phase, setPhase] = useState<Phase>('intro');
  const [modality, setModality] = useState<Modality>(startModality);
  const [helper, setHelper] = useState<Modality | null>(null); // the explainer that was used after a struggle
  const [run, setRunState] = useState<MissionRunState>({ mistakes: 0, consecutiveMistakes: 0, hints: 0 });
  const runRef = useRef(run);
  const setRun = useCallback((f: (r: MissionRunState) => MissionRunState) => {
    runRef.current = f(runRef.current);
    setRunState(runRef.current);
  }, []);
  const [offer, setOffer] = useState<(Adaptation & { trigger: 'mistakes' | 'hesitation' }) | null>(null);
  const [offered, setOffered] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<L10n | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exitAsk, setExitAsk] = useState(false);
  const [woke, setWoke] = useState<LocationId[]>([]);
  const [struggledOverall, setStruggledOverall] = useState(false);
  const started = useRef(Date.now());
  const lastStep = useRef(Date.now());
  const stepsTaken = useRef(0);
  const retryKey = useRef(0);
  // Mirrors this attempt to the server (no-op offline). The game never waits on it.
  const sync = useRef<MissionSync>(null);
  sync.current ??= new MissionSync();

  useEffect(() => {
    moveTo(mission.location);
    saveLocation(mission.location);
  }, [mission.location, moveTo]);
  useEffect(() => {
    if (offer) sync.current?.signal({ kind: 'adapt_offer', modality: offer.modality });
  }, [offer]);

  /* ── signals ───────────────────────────────── */
  const onStep = useCallback(
    (correct: boolean) => {
      const ms = Date.now() - lastStep.current;
      lastStep.current = Date.now();
      stepsTaken.current += 1;
      signal({ type: 'step', topic: mission.topic, concept: mission.concept, correct, ms });
      sync.current?.signal({ kind: 'step', correct, ms });
      setHintOpen(false);
      setRun((r) => ({ ...r, mistakes: r.mistakes + (correct ? 0 : 1), consecutiveMistakes: correct ? 0 : r.consecutiveMistakes + 1 }));
      const next = runRef.current;
      if (!correct && isStruggling(next) && ADAPTABLE.has(mission.mechanic) && (modality === 'hands-on' || modality === 'guided')) {
        setStruggledOverall(true);
        const a = chooseAdaptation(model, mission.concept, modality, 'mistakes');
        if (!offered.has(a.modality)) setOffer({ ...a, trigger: 'mistakes' });
      }
    },
    [signal, mission, model, modality, offered, setRun],
  );

  // Hesitation: far slower than this learner's own pace → a gentle offer, once.
  useEffect(() => {
    if (phase !== 'play' || !ADAPTABLE.has(mission.mechanic) || modality !== 'hands-on') return;
    const id = window.setInterval(() => {
      // Never while someone is still reading the instructions — only once they've started.
      if (offer || offered.has('hesitation') || stepsTaken.current === 0) return;
      if (isHesitating(model, Date.now() - lastStep.current)) {
        setOffered((o) => new Set(o).add('hesitation'));
        setOffer({ ...chooseAdaptation(model, mission.concept, modality, 'hesitation'), trigger: 'hesitation' });
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, mission, modality, model, offer, offered]);

  const acceptOffer = () => {
    if (!offer) return;
    sync.current?.signal({ kind: 'adapt_accept', modality: offer.modality });
    setOffered((o) => new Set(o).add(offer.modality));
    if (offer.modality === 'guided') {
      retryKey.current++;
      setModality('guided');
    } else {
      setHelper(offer.modality);
      setModality(offer.modality);
    }
    setRun((r) => ({ ...r, consecutiveMistakes: 0 }));
    setOffer(null);
    setProgress(0);
  };
  const declineOffer = () => {
    if (offer) setOffered((o) => new Set(o).add(offer.modality));
    setOffer(null);
  };

  const requestHint = () => {
    if (!hint) return;
    setHintOpen(true);
    setRun((r) => ({ ...r, hints: r.hints + 1 }));
    signal({ type: 'hint', topic: mission.topic, concept: mission.concept });
    sync.current?.signal({ kind: 'hint' });
  };

  /* ── completion ────────────────────────────── */
  const onComplete = useCallback(() => {
    // An explainer finished → continue into a guided retry of the real interaction.
    if ((modality === 'visual' || modality === 'story') && ADAPTABLE.has(mission.mechanic)) {
      retryKey.current++;
      setModality('guided');
      setRun((r) => ({ ...r, consecutiveMistakes: 0 }));
      setProgress(0);
      toast(t('wudu.guidedNext'));
      return;
    }
    const creditModality: Modality = helper ?? modality;
    const result: MissionResult = {
      missionId: mission.id,
      completedAt: Date.now(),
      mistakes: helper ? Math.min(run.mistakes, 1) : run.mistakes,
      hintsUsed: run.hints,
      durationMs: Date.now() - started.current,
      mechanic: mission.mechanic,
      modality: creditModality,
    };
    const before = { completed: Object.keys(results) };
    const after = { completed: [...new Set([...before.completed, mission.id])] };
    const wokeNow = newlyUnlocked(LOCATIONS, before, after, MISSIONS).map((x) => x.id);
    signal({ type: 'complete', topic: mission.topic, concept: mission.concept, result });
    complete(result, { id: mission.reward.id, kind: mission.reward.kind, at: Date.now(), missionId: mission.id }, struggledOverall || run.mistakes >= 3);
    for (const w of wokeNow) {
      unlockPlace(w);
      pushCelebration({ kind: 'unlock', locationId: w });
    }
    setWoke(wokeNow);
    setPhase('done');
    // The server re-checks the unlock rules and records the result; its answer reconciles progress.
    void sync.current?.complete({ modality, helperModality: helper, durationMs: result.durationMs, retries: retryKey.current });
  }, [modality, mission, helper, run, results, signal, complete, struggledOverall, unlockPlace, pushCelebration, t, setRun]);

  const mechanicProps: MechanicProps = { mission, guided: modality === 'guided', onStep, setHint, setProgress, onComplete };
  // Online: the server's mission version (pinned for this session). Offline: the bundled demo mission.
  const content = useMissionDefinition(mission.id);
  // Words come from the version the server served (published or demo); the bundled copy is only the offline fallback.
  const title = content.def?.title ?? mission.title;
  const summary = content.def?.summary ?? mission.summary;
  const Played = MECHANICS[mission.mechanic as InteractionType] ?? MECHANICS.reflection;
  // At the guardian's limit a new mission can't start; one already in play can be finished and saved.
  const timeLimited = useTimeLimited();
  const loc = LOCATION_BY_ID[mission.location];

  return (
    <div className="mission" data-location={mission.location}>
      <div className="mission-bg" aria-hidden />
      <header className="mission-top">
        <IconButton icon="close" label={t('m.exit')} onClick={() => (phase === 'play' ? setExitAsk(true) : navigate('/'))} tone="glass" />
        <div className="mission-top__title">
          <span className="t-caption gold">
            {t('m.number', { n: mission.number })} · {l(loc.name)}
          </span>
          <span className="mission-top__name">{l(title)}</span>
        </div>
        {phase === 'play' && (
          <div className="row" style={{ gap: 8 }}>
            {modality !== 'hands-on' && <span className="chip chip--turquoise hide-mobile">{t(`m.modeName.${modality}`)}</span>}
            <IconButton icon="star" label={t('m.hint')} tone="glass" onClick={requestHint} disabled={!hint} />
          </div>
        )}
      </header>
      {phase === 'play' && <ProgressRoad value={progress} />}
      {phase === 'intro' && timeLimited && <RestScreen />}

      <main className="mission-stage" id="main">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.section key="intro" className="mission-intro" initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <div className="mission-intro__art">
                <CharacterPreview look={profile.look} />
              </div>
              <span className="t-caption gold">{t('m.number', { n: mission.number })}</span>
              <h1 className="t-h1">{l(title)}</h1>
              <p className="muted" style={{ maxWidth: 460 }}>
                {l(summary)}
              </p>
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                <span className="chip chip--quiet">
                  <Icon name="clock" size={14} /> {t('m.minutes', { n: mission.minutes })}
                </span>
                <span className="chip chip--quiet">{t(`m.modeName.${modality}`)}</span>
                {results[mission.id] && <span className="chip chip--emerald">{t('m.completed')}</span>}
                {content.state === 'server' && content.def ? (
                  <span className={`chip ${content.def.isDemo ? 'chip--demo' : 'chip--emerald'}`} title={t('m.contentServer', { v: content.def.version })}>
                    {content.def.isDemo ? t('m.demoMission', { v: content.def.version }) : t('m.contentVersion', { v: content.def.version })}
                  </span>
                ) : content.state === 'bundled' ? (
                  <span className="chip chip--demo">{t('m.demoOffline')}</span>
                ) : null}
              </div>
              <Button size="lg" iconEnd="forward" data-autofocus disabled={content.state === 'loading'} onClick={() => { lastStep.current = Date.now(); started.current = Date.now(); sync.current?.start(mission.id, modality, content.def?.version); setPhase('play'); }}>
                {t('m.start')}
              </Button>
            </motion.section>
          )}

          {phase === 'play' && (
            <motion.section key={`play-${modality}-${retryKey.current}`} className="mission-play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <MissionPayloadProvider value={content.def?.payload ?? null}>
              <Suspense fallback={<StarLoader label={t('m.loading')} />}>
                {modality === 'visual' ? (
                  <VisualExplainer {...mechanicProps} />
                ) : modality === 'story' && ADAPTABLE.has(mission.mechanic) ? (
                  <StoryMode {...mechanicProps} />
                ) : (
                  <Played {...mechanicProps} />
                )}
              </Suspense>
              </MissionPayloadProvider>
            </motion.section>
          )}

          {phase === 'done' && (
            <Completion key="done" missionId={mission.id} struggled={struggledOverall || run.mistakes >= 3} helper={helper} woke={woke} onAsk={() => openTutor(mission.knowledge[0])} />
          )}
        </AnimatePresence>
      </main>

      {/* Siraj's hint bubble */}
      <AnimatePresence>
        {hintOpen && hint && phase === 'play' && (
          <motion.aside className="siraj-bubble" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <span className="siraj-bubble__light" aria-hidden>
              <Star size={14} color="currentColor" />
            </span>
            <p>
              <strong>{t('m.hintFromSiraj')}</strong> {l(hint)}
            </p>
            <IconButton icon="close" size="sm" tone="plain" label={t('a.close')} onClick={() => setHintOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Adaptive offer */}
      <AnimatePresence>
        {offer && phase === 'play' && (
          <motion.aside className="adapt" role="alertdialog" aria-labelledby="adapt-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4, ease: [0.22, 0.61, 0.21, 1] }}>
            <span className="siraj-bubble__light" aria-hidden>
              <Star size={16} color="currentColor" />
            </span>
            <div style={{ flex: 1 }}>
              <h2 id="adapt-title" className="adapt__title">
                {t('m.adaptTitle')}
              </h2>
              <p className="t-small">{t(`m.adapt.${offer.reason}`, { mode: t(`m.mode.${offer.modality}`) })}</p>
              <div className="row wrap" style={{ marginTop: 12 }}>
                <Button size="sm" variant="emerald" icon="wand" onClick={acceptOffer}>
                  {t('m.switchNow')} · {t(`m.modeName.${offer.modality}`)}
                </Button>
                <Button size="sm" variant="ghost" onClick={declineOffer}>
                  {t('m.keepGoing')}
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Dialog
        open={exitAsk}
        onClose={() => setExitAsk(false)}
        title={t('m.exit')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setExitAsk(false)}>
              {t('m.stay')}
            </Button>
            <Button variant="secondary" onClick={() => { void sync.current?.abandon(); navigate('/'); }}>
              {t('m.leave')}
            </Button>
          </>
        }
      >
        {t('m.exitConfirm')}
      </Dialog>
    </div>
  );
}

function ProgressRoad({ value }: { value: number }) {
  return (
    <div className="mission-road" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <motion.span className="mission-road__fill" initial={false} animate={{ scaleX: Math.max(0.01, value) }} transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }} />
      <motion.span className="mission-road__star" initial={false} animate={{ insetInlineStart: `${Math.max(0.01, value) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }} />
    </div>
  );
}

function Completion({ missionId, struggled, helper, woke, onAsk }: { missionId: string; struggled: boolean; helper: Modality | null; woke: LocationId[]; onAsk: () => void }) {
  const mission = MISSION_BY_ID[missionId];
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const profile = useProfile((s) => s.profile)!;
  const journey = useJourney();
  const entry = getKnowledge(mission.knowledge[0]);
  const nextRec = journey.recs.find((r) => r.mission.id !== mission.id);
  const topicName = t(`prof.topic.${mission.topic}`);
  const noticed = helper ? t('m.noticedSwitched', { mode: t(`m.mode.${helper}`) }) : struggled ? t('m.noticedStruggle', { topic: topicName }) : t('m.noticedSmooth');
  const back = () => navigate('/', { state: woke[0] ? { wake: woke[0] } : undefined });
  const nextOpen = nextRec && isUnlocked(LOCATION_BY_ID[nextRec.mission.location], { completed: journey.completed }, MISSIONS);

  return (
    <motion.section className="mission-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} aria-labelledby="done-title">
      <div className="done-hero">
        <div className="done-reward">
          <motion.span className="done-star" initial={reduced ? false : { y: 60, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}>
            <Star size={30} color="currentColor" />
          </motion.span>
          <Character look={profile.look} size={130} pose="cheer" expression="happy" />
        </div>
        <span className="t-caption gold">{t('m.doneTitle')}</span>
        <h1 id="done-title" className="t-h1">
          {l(mission.reward.name)}
        </h1>
        <p className="muted">{t('m.reward')}</p>
        {woke.map((w) => (
          <span key={w} className="chip chip--gold">
            <Icon name="lantern" size={14} /> {t('world.newPlace')}: {l(LOCATION_BY_ID[w].name)}
          </span>
        ))}
      </div>

      <div className="done-grid">
        <div className="card">
          <p className="t-caption muted card__eyebrow">{t('m.noticed')}</p>
          <p style={{ lineHeight: 1.6 }}>{noticed}</p>
          <Button variant="ghost" size="sm" icon="star" onClick={onAsk} style={{ marginTop: 8, paddingInline: 0 }}>
            {t('m.askWhy')}
          </Button>
        </div>
        {entry && (
          <div className="done-learned">
            <p className="t-caption muted" style={{ marginBottom: 10 }}>
              {t('m.learned')}
            </p>
            <EvidencePanel entry={entry} compact />
          </div>
        )}
      </div>

      <div className="row wrap done-actions">
        <Button variant={woke.length ? 'celebrate' : 'primary'} size="lg" icon="home" onClick={back}>
          {t('m.backToWorld')}
        </Button>
        {nextRec && nextOpen && (
          <Button variant="secondary" size="lg" iconEnd="forward" onClick={() => navigate(`/mission/${nextRec.mission.id}`)}>
            {t('m.nextMission')} · {l(nextRec.mission.title)}
          </Button>
        )}
      </div>
    </motion.section>
  );
}
