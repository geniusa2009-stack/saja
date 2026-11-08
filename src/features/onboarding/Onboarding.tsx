/**
 * Cinematic onboarding — the beginning of a journey, not a registration form.
 * One gentle question per screen; the guiding star moves with you and the
 * road at the bottom lights as you go. Only useful questions are asked;
 * schedule preferences come later, in My Day, when they're relevant.
 */
import { isReservedName } from '@/domain/names';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useConnection } from '@/store/connection';
import { AnimatePresence, motion } from 'motion/react';
import type { AgeBand, CharacterLook, GoalId, Level, Modality, Purpose, TopicId, Profile } from '@/domain/types';
import { Button, Segmented, Tile, TextInput, DUR, EASE, useReducedMotion } from '@/design-system';
import { Icon, type IconName } from '@/brand/Icon';
import { SajaMark, Star } from '@/brand/SajaMark';
import { SajaWordmark } from '@/brand/SajaWordmark';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { useLearner } from '@/store/learner';
import { CharacterCreator, CharacterPreview } from '@/features/character/CharacterCreator';
import { DEFAULT_LOOK } from '@/features/character/palette';
import { PATHS, pathFor, personalizeRecommendations } from '@/domain/journeyEngine';
import { recommend, createLearnerModel } from '@/domain/adaptive';
import { MISSIONS } from '@/content/missions';
import './onboarding.css';

type Step = 'welcome' | 'purpose' | 'age' | 'guardian' | 'level' | 'goals' | 'style' | 'preview' | 'character';

const GOALS: { id: GoalId; icon: IconName; topics: TopicId[] }[] = [
  { id: 'prayer', icon: 'day', topics: ['prayer', 'purification'] },
  { id: 'quran', icon: 'learn', topics: ['quran'] },
  { id: 'basics', icon: 'compass', topics: ['beliefs', 'terminology'] },
  { id: 'character', icon: 'heart', topics: ['character'] },
  { id: 'community', icon: 'community', topics: [] },
  { id: 'consistency', icon: 'star', topics: [] },
];
const PURPOSES: { id: Purpose; icon: IconName }[] = [
  { id: 'exploring', icon: 'explore' },
  { id: 'new-muslim', icon: 'sparkle' },
  { id: 'learn-more', icon: 'learn' },
  { id: 'child', icon: 'star' },
];
const STYLES: { id: Modality; icon: IconName }[] = [
  { id: 'hands-on', icon: 'hand' },
  { id: 'visual', icon: 'image' },
  { id: 'story', icon: 'quote' },
  { id: 'guided', icon: 'lantern' },
];

export default function Onboarding() {
  const { t, l, locale, isRTL } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const setLocale = useSettings((s) => s.setLocale);
  const existing = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const resetLearner = useLearner((s) => s.reset);

  const [step, setStep] = useState<Step>('welcome');
  const [dirSign, setDirSign] = useState(1);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [age, setAge] = useState<AgeBand | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [style, setStyle] = useState<Modality | null>(null);
  const [look, setLook] = useState<CharacterLook>(DEFAULT_LOOK);
  const [name, setName] = useState('');

  if (existing) return <Navigate to="/" replace />;

  const flow: Step[] = ['welcome', 'purpose', 'age', ...(age === 'child' ? (['guardian'] as Step[]) : []), 'level', 'goals', 'style', 'preview', 'character'];
  const idx = flow.indexOf(step);
  const go = (to: Step, sign = 1) => {
    setDirSign(sign);
    setStep(to);
  };
  const next = () => go(flow[Math.min(idx + 1, flow.length - 1)], 1);
  const back = () => go(flow[Math.max(idx - 1, 0)], -1);

  const finish = () => {
    const interests = [...new Set(GOALS.filter((g) => goals.includes(g.id)).flatMap((g) => g.topics))];
    setProfile({
      name: name.trim() || (locale === 'ar' ? 'مسافر' : 'Traveller'),
      look,
      purpose: purpose ?? 'learn-more',
      ageBand: age ?? 'adult',
      level: level ?? 'beginner',
      goals,
      interests,
      modality: style ?? 'hands-on',
      createdAt: Date.now(),
    });
    resetLearner(style ?? 'hands-on');
    navigate('/', { replace: true, state: { arrival: true } });
  };

  // The preview uses the same recommendation algorithm over the initially open places.
  const previewInterests = [...new Set(GOALS.filter((g) => goals.includes(g.id)).flatMap((g) => g.topics))];
  const previewProfile: Profile = { name: name.trim() || 'Traveller', look, purpose: purpose ?? 'learn-more', ageBand: age ?? 'adult', level: level ?? 'beginner', goals, interests: previewInterests, modality: style ?? 'hands-on', createdAt: 0 };
  const previewModel = createLearnerModel(previewProfile.modality);
  const previewMission = personalizeRecommendations(previewProfile, previewModel, recommend({ model: previewModel, missions: MISSIONS, completed: [], unlocked: new Set(['village', 'mosque']), ageBand: previewProfile.ageBand, interests: previewInterests }))[0]?.mission;

  const canNext: Record<Step, boolean> = {
    welcome: true,
    purpose: !!purpose,
    age: !!age,
    guardian: true,
    level: !!level,
    goals: true,
    style: !!style,
    preview: true,
    character: name.trim().length > 0 && !isReservedName(name),
  };

  const x = (isRTL ? -1 : 1) * dirSign * 40;
  const variants = {
    enter: reduced ? { opacity: 0 } : { opacity: 0, x },
    center: { opacity: 1, x: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, x: -x },
  };

  // The guiding star drifts along the sky as you progress.
  const starX = 50 + (isRTL ? -1 : 1) * (idx / Math.max(1, flow.length - 1) - 0.5) * 50;

  return (
    <div className="ob">
      <div className="ob-sky" aria-hidden>
        <motion.div className="ob-star" animate={{ left: `${starX}%` }} transition={{ duration: reduced ? 0 : 1.2, ease: EASE }}>
          <Star size={18} color="#F6E8C6" />
        </motion.div>
        <div className="ob-hills" />
      </div>

      <header className="ob-top">
        {idx > 0 ? <Button variant="ghost" size="sm" icon="back" onClick={back}>{t('a.back')}</Button> : <span />}
        <div className="row" style={{ gap: 10 }}>
          <SajaMark size={26} />
          <SajaWordmark width={62} />
        </div>
        <span className="t-caption muted ob-count">{idx > 0 ? t('ob.step', { n: idx, total: flow.length - 1 }) : ''}</span>
      </header>

      <main className={`ob-main ${step === 'character' ? 'ob-main--wide' : ''}`} id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={step} className="ob-card" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0.01 : DUR.sm + 0.1, ease: EASE }} aria-live="polite">
            {step === 'welcome' && (
              <div className="ob-welcome">
                <SajaMark size={110} />
                <h1 className="t-display">{t('ob.welcome')}</h1>
                <p className="muted t-body">{t('ob.welcomeSub')}</p>
                <Segmented
                  label={t('ob.langQ')}
                  value={locale}
                  onChange={setLocale}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'ar', label: 'العربية' },
                  ]}
                />
                <HaveAccount />
              </div>
            )}

            {step === 'purpose' && (
              <Question title={t('ob.purposeQ')}>
                <div className="ob-tiles" role="radiogroup" aria-label={t('ob.purposeQ')}>
                  {PURPOSES.map((p) => (
                    <Tile
                      key={p.id}
                      role="radio"
                      icon={p.icon}
                      selected={purpose === p.id}
                      title={t(`ob.purpose.${p.id}`)}
                      sub={t(`ob.purpose.${p.id}Sub`)}
                      onClick={() => {
                        setPurpose(p.id);
                        if (p.id === 'child') setAge('child');
                        else if (age === 'child') setAge(null);
                      }}
                    />
                  ))}
                </div>
              </Question>
            )}

            {step === 'age' && (
              <Question title={t('ob.ageQ')} note={t('ob.ageNote')}>
                <div className="ob-tiles" role="radiogroup" aria-label={t('ob.ageQ')}>
                  {(['child', 'teen', 'adult'] as AgeBand[]).map((a) => (
                    <Tile key={a} role="radio" selected={age === a} title={t(`ob.age.${a}`)} onClick={() => setAge(a)} icon={a === 'child' ? 'star' : a === 'teen' ? 'compass' : 'profile'} />
                  ))}
                </div>
              </Question>
            )}

            {step === 'guardian' && (
              <Question title={t('ob.guardianTitle')}>
                <div className="card card--flat ob-guardian">
                  <Icon name="shield" size={28} />
                  <p>{t('ob.guardianBody')}</p>
                </div>
              </Question>
            )}

            {step === 'level' && (
              <Question title={t('ob.levelQ')}>
                <div className="ob-tiles" role="radiogroup" aria-label={t('ob.levelQ')}>
                  {(['beginner', 'some', 'confident'] as Level[]).map((l, i) => (
                    <Tile key={l} role="radio" selected={level === l} title={t(`ob.level.${l}`)} onClick={() => setLevel(l)} icon={<Dots n={i + 1} />} />
                  ))}
                </div>
              </Question>
            )}

            {step === 'goals' && (
              <Question title={t('ob.goalsQ')} note={t('ob.goalsSub')}>
                <div className="ob-grid">
                  {GOALS.map((g) => (
                    <Tile key={g.id} role="checkbox" icon={g.icon} selected={goals.includes(g.id)} title={t(`ob.goal.${g.id}`)} onClick={() => setGoals((cur) => (cur.includes(g.id) ? cur.filter((x) => x !== g.id) : [...cur, g.id]))} />
                  ))}
                </div>
              </Question>
            )}

            {step === 'style' && (
              <Question title={t('ob.styleQ')} note={t('ob.styleNote')}>
                <div className="ob-grid" role="radiogroup" aria-label={t('ob.styleQ')}>
                  {STYLES.map((s) => (
                    <Tile key={s.id} role="radio" icon={s.icon} selected={style === s.id} title={t(`ob.style.${s.id}`)} sub={t(`ob.style.${s.id}Sub`)} onClick={() => setStyle(s.id)} />
                  ))}
                </div>
              </Question>
            )}

            {step === 'preview' && (
              <Question title={l({ ar: 'دي بداية رحلتك، وممكن تغيّرها بعدين', en: 'Here is your path — you can change it later' })}>
                <div className="ob-journey-preview">
                  <span className="t-caption gold">SAJA · {l({ ar: 'رحلة شخصية', en: 'Your learning path' })}</span>
                  <h2>{l(PATHS[pathFor(purpose ?? 'learn-more')].title)}</h2>
                  <p>{l(PATHS[pathFor(purpose ?? 'learn-more')].intro)}</p>
                  <p>{l(PATHS[pathFor(purpose ?? 'learn-more')].invitation)}</p>
                  <strong>{l({ ar: 'أول خطوة مقترحة من اختياراتك', en: 'Your suggested first mission' })}</strong>
                  <p>{previewMission ? l(previewMission.title) : l({ ar: 'استكشف المكتبة واختر ما يناسبك.', en: 'Explore the library at your own pace.' })}</p>
                  <strong>{l({ ar: 'أهدافك', en: 'Your goals' })}</strong>
                  <p>{goals.length ? goals.map((goal) => t(`ob.goal.${goal}`)).join(' · ') : l({ ar: 'هنقترح بداية هادئة، وتقدر تختار أي موضوع.', en: 'We will suggest a gentle start; you can explore any topic.' })}</p>
                  <strong>{l({ ar: 'مستواك وطريقة التعلم', en: 'Your level and learning style' })}</strong>
                  <p>{level ? t(`ob.level.${level}`) : '—'} · {style ? t(`ob.style.${style}`) : '—'}</p>
                  <p className="t-small muted">{l({ ar: 'هنحدّث الاقتراحات من تقدمك الفعلي. الاختيارات لا تقيّم إيمانك، ومش هتمسح تقدمك لو غيّرتها.', en: 'Suggestions will adapt as you learn. These choices do not judge your beliefs, and changing them will not erase progress.' })}</p>
                </div>
              </Question>
            )}

            {step === 'character' && (
              <div className="ob-character">
                <div className="ob-character__preview">
                  <h1 className="t-h1">{t('char.title')}</h1>
                  <p className="muted t-small">{t('char.sub')}</p>
                  <CharacterPreview look={look} name={name.trim() || undefined} />
                </div>
                <div className="ob-character__controls">
                  <div className="field">
                    <label className="field__label" htmlFor="ob-name">
                      {t('char.name')}
                    </label>
                    <TextInput id="ob-name" value={name} maxLength={24} placeholder={t('char.namePh')} autoComplete="nickname" onChange={(e) => setName(e.target.value)} data-autofocus />
                    {isReservedName(name) ? (
                      <p className="field__hint" role="alert">
                        {t('char.nameReserved')}
                      </p>
                    ) : (
                      age === 'child' && <p className="field__hint">{t('char.nameKidNote')}</p>
                    )}
                  </div>
                  <CharacterCreator look={look} onChange={setLook} />
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="ob-foot">
        <Road progress={idx / (flow.length - 1)} />
        {step === 'character' ? (
          <Button variant="celebrate" size="lg" iconEnd="forward" onClick={finish} disabled={!canNext.character}>
            {t('char.enter')}
          </Button>
        ) : step === 'guardian' ? (
          <Button size="lg" icon="shield" onClick={next}>
            {t('ob.guardianOk')}
          </Button>
        ) : (
          <Button size="lg" iconEnd="forward" onClick={next} disabled={!canNext[step]}>
            {step === 'welcome' ? t('a.begin') : t('a.continue')}
          </Button>
        )}
      </footer>
    </div>
  );
}

function Question({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="ob-q">
      <h1 className="t-h1">{title}</h1>
      {note && <p className="muted t-small">{note}</p>}
      {children}
    </div>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className="ob-dots" aria-hidden>
      {[1, 2, 3].map((i) => (
        <i key={i} data-on={i <= n || undefined} />
      ))}
    </span>
  );
}

/** Progress is always a road, never a bar alone. */
function Road({ progress }: { progress: number }) {
  return (
    <svg className="ob-road" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
      <path d="M4 18 C60 18 70 6 130 8 C190 10 210 20 296 6" fill="none" stroke="rgb(244 236 221 / .14)" strokeWidth="2" strokeLinecap="round" />
      <motion.path d="M4 18 C60 18 70 6 130 8 C190 10 210 20 296 6" fill="none" stroke="#DDBE7F" strokeWidth="2.4" strokeLinecap="round" initial={false} animate={{ pathLength: Math.max(0.02, progress) }} transition={{ duration: 0.8, ease: EASE }} />
    </svg>
  );
}

/** Only when a SAJA server is reachable: continuing a saved journey on this device. */
function HaveAccount() {
  const { t } = useI18n();
  const online = useConnection((s) => s.status === 'online');
  if (!online) return null;
  return (
    <Link to="/account" className="t-small muted" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {t('acc.haveAccount')}
    </Link>
  );
}
