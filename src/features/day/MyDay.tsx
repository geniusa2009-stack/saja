/**
 * MY DAY — a premium personal companion, not a spreadsheet.
 * Prayer times are anchors shown with respect (tracking is private and
 * optional — nothing is ever locked behind it). The plan reshapes itself
 * around what you say, and never shames you for what didn't happen.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { buildPlan, parseConstraints, planHeadline, type PlanItem } from '@/domain/planner';
import { daySync, useServerDay } from '@/api/daySync';
import { useConnection } from '@/store/connection';
import { formatHour, PRAYERS, CITIES, coarsen, type PrayerName } from '@/domain/prayerTimes';
import { KNOWLEDGE, getKnowledge } from '@/content/knowledge';
import { Button, Chip, Field, IconButton, Section, Segmented, Sheet, Switch, TextInput, toast, useReducedMotion } from '@/design-system';
import { Icon, type IconName } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { PRAYER_NAMES, formatDuration, useJourney, usePrayerInfo, usePrayerLocation } from '@/app/hooks';
import { DevotionalCompanion } from './DevotionalCompanion';
import { useDay, todayKey } from '@/store/day';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { useTutor } from '@/store/tutor';
import './day.css';

const KIND_ICON: Record<PlanItem['kind'], IconName> = {
  prayer: 'day',
  commitment: 'clock',
  study: 'learn',
  break: 'water',
  review: 'refresh',
  mission: 'play',
  quran: 'learn',
  reflection: 'moon',
  focus: 'explore',
};

export default function MyDay() {
  const { t, l, locale, intl } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const profile = useProfile((s) => s.profile)!;
  const memory = useProfile((s) => s.memory);
  const prayer = usePrayerInfo();
  const prayerLocation = usePrayerLocation();
  const journey = useJourney();
  const day = useDay();
  const focusMode = useSettings((s) => s.focusMode);
  const setFocusMode = useSettings((s) => s.setFocusMode);
  const showEvidence = useTutor((s) => s.showEvidence);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const note = day.notes[todayKey()] ?? '';
  const [draft, setDraft] = useState(note);
  const [goalText, setGoalText] = useState('');

  const constraints = useMemo(() => parseConstraints(note), [note]);
  const next = journey.next?.mission;
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const server = useServerDay(online);
  const localPlan = useMemo(
    () =>
      buildPlan({
        prefs: day.prefs,
        prayerTimes: prayer.times,
        weekday: prayer.weekday,
        now: prayer.nowHours,
        constraints,
        goals: profile.goals,
        mission: next ? { id: next.id, title: next.title, minutes: next.minutes } : undefined,
      }),
    [day.prefs, prayer.times, prayer.weekday, prayer.nowHours, constraints, profile.goals, next],
  );
  // Online the server's plan is the durable one; the device plan shows instantly offline or while it loads.
  const plan = server.day?.plan.items.length ? server.day.plan.items : localPlan;
  const planSource: 'server' | 'device' = server.day?.plan.items.length ? 'server' : 'device';
  const done = new Set(day.done[todayKey()] ?? []);
  const marks = day.prayers[todayKey()] ?? {};

  const h = prayer.nowHours;
  const greetKey = h < 4 || h >= 22 ? 'day.greetingNight' : h < 12 ? 'day.greetingMorning' : h < 17 ? 'day.greetingAfternoon' : 'day.greetingEvening';
  const today = new Date();
  const gregorian = new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  const hijri = (() => {
    try {
      return new Intl.DateTimeFormat(`${locale === 'ar' ? 'ar-SA' : 'en'}-u-ca-islamic-umalqura`, { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
    } catch {
      return '';
    }
  })();

  const tell = (text: string) => {
    setDraft(text);
    day.setNote(text);
    // Only the structured meaning ("exam tomorrow", "20 minutes") is sent — never the words.
    void server.setConstraints(parseConstraints(text));
    toast(t('day.planUpdated'));
  };

  const setMark = (p: (typeof PRAYERS)[number], m: 'prayed' | 'later' | null) => {
    day.markPrayer(p, m);
    daySync.markPrayer(p, m);
  };

  /** "Remind me later": schedules a real reminder at the prayer's time (or in 15 minutes if it's about to start). */
  const remindLater = async (p: (typeof PRAYERS)[number]) => {
    setMark(p, 'later');
    const inMs = (prayer.times[p] - prayer.nowHours) * 3_600_000;
    const at = new Date(Date.now() + (inMs > 5 * 60_000 ? inMs : 15 * 60_000));
    const r = await daySync.remind(p, PRAYER_NAMES[p], at);
    if (r.status === 'scheduled') toast(t('day.reminderSet', { time: new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit' }).format(r.at) }));
    else if (r.status === 'duplicate') toast(t('day.reminderAlready'));
    else if (r.status === 'offline') toast(t('day.reminderOffline'));
    else toast(t('day.reminderFailed'));
  };

  // Daily Deen rotates by day of year.
  const doy = Math.floor((Date.now() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const reflection = KNOWLEDGE[doy % KNOWLEDGE.length];
  const dua = getKnowledge(h >= 19 || h < 4 ? 'k-sleep-dua' : 'k-knowledge-dua')!;
  const learning = KNOWLEDGE[(doy + 5) % KNOWLEDGE.length];

  return (
    <Page
      eyebrow={`${gregorian}${hijri ? ` · ${hijri}` : ''}`}
      title={t(greetKey, { name: profile.name })}
      actions={
        <label className="focus-toggle">
          <Icon name="focus" size={18} />
          <span>
            <strong>{t('day.focus')}</strong>
            <span className="t-small muted">{t('day.focusSub')}</span>
          </span>
          <Switch checked={focusMode} onChange={setFocusMode} label={t('day.focus')} />
        </label>
      }
    >
      <div className="day-grid">
        {/* ── Prayer companion ─────────────────────── */}
        <section className="card card--raised prayer-card" aria-labelledby="prayers-h">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}>
            <div>
              <h2 id="prayers-h" className="section__title">
                {t('day.prayers')}
              </h2>
              <button type="button" className="place-btn" onClick={() => setPlaceOpen(true)}>
                <Icon name="pin" size={14} /> {l(prayer.label)} <Icon name="down" size={14} />
              </button>
            </div>
            <div className="next-prayer">
              <span className="t-caption gold">{t('day.next', { prayer: l(PRAYER_NAMES[prayer.next.name]) })}</span>
              <span className="next-prayer__time">{t('day.in', { time: formatDuration(prayer.next.inMinutes, t) })}</span>
            </div>
          </div>

          <SunArc times={prayer.times} now={prayer.nowHours} reduced={reduced} />

          <ul className="prayer-list">
            {PRAYERS.map((p) => {
              const isNext = prayer.next.name === p;
              const isNow = prayer.current === p;
              const mark = marks[p];
              return (
                <li key={p} className="prayer-row" data-next={isNext || undefined} data-now={isNow || undefined}>
                  <span className="prayer-row__name">{l(PRAYER_NAMES[p])}</span>
                  <span className="prayer-row__time">{formatHour(prayer.times[p], intl)}</span>
                  <span className="spacer" />
                  {mark === 'prayed' ? (
                    <button type="button" className="chip chip--emerald" onClick={() => setMark(p, null)} aria-pressed="true">
                      <Icon name="check" size={14} /> {t('day.prayed')}
                    </button>
                  ) : prayer.times[p] <= prayer.nowHours + 0.01 ? (
                    <button type="button" className="chip" onClick={() => setMark(p, 'prayed')} aria-pressed="false">
                      {t('day.prayed')}
                    </button>
                  ) : isNext ? (
                    <button
                      type="button"
                      className="chip chip--quiet"
                      onClick={() => void remindLater(p)}
                      aria-pressed={mark === 'later'}
                    >
                      <Icon name="clock" size={14} /> {t('day.later')}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="t-small muted">{t('day.companionNote')}</p>
        </section>

        {/* ── Gentle plan ───────────────────────────── */}
        <section className="card plan-card" aria-labelledby="plan-h">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 id="plan-h" className="section__title">
                {t('day.plan')}
              </h2>
              <p className="t-small muted">{t('day.planSub')}</p>
              <p className="t-caption muted">{planSource === 'server' ? t('day.planServer') : online ? t('day.planDeviceLoading') : t('day.planDevice')}</p>
            </div>
            <IconButton icon="settings" label={t('day.schedule')} size="sm" onClick={() => setScheduleOpen(true)} />
          </div>

          <form
            className="input-row"
            onSubmit={(e) => {
              e.preventDefault();
              tell(draft.trim());
            }}
          >
            <label className="sr-only" htmlFor="plan-note">
              {t('day.tell')}
            </label>
            <TextInput id="plan-note" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('day.tellPh')} />
            <IconButton icon="send" label={t('a.send')} type="submit" />
          </form>
          <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
            {(['busy', 'exam', '20', 'tired', 'free'] as const).map((k) => (
              <Chip key={k} onClick={() => tell(t(`day.chip.${k}`))} pressed={note === t(`day.chip.${k}`)}>
                {t(`day.chip.${k}`)}
              </Chip>
            ))}
            {note && (
              <Chip tone="quiet" icon="refresh" onClick={() => tell('')}>
                {t('day.reset')}
              </Chip>
            )}
          </div>

          <div className="siraj-says">
            <span className="siraj-orb siraj-orb--sm" aria-hidden>
              <Star size={12} color="currentColor" />
            </span>
            <AnimatePresence mode="wait">
              <motion.p key={note} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {planHeadline(constraints, locale)}
              </motion.p>
            </AnimatePresence>
          </div>

          <ol className="timeline">
            {plan.map((item) => {
              const past = item.start + item.minutes / 60 < prayer.nowHours;
              const isDone = done.has(item.id);
              const checkable = item.kind !== 'prayer' && item.kind !== 'commitment';
              return (
                <motion.li key={item.id} layout={!reduced} className="tl-item" data-kind={item.kind} data-past={past || undefined} data-done={isDone || undefined}>
                  <span className="tl-time">{formatHour(item.start, intl)}</span>
                  <span className="tl-dot" aria-hidden>
                    <Icon name={KIND_ICON[item.kind]} size={14} />
                  </span>
                  <div className="tl-body">
                    <span className="tl-title">{l(item.title)}</span>
                    <span className="tl-meta">
                      {t(`day.kind.${item.kind}`)} · {t('time.min', { n: item.minutes })}
                    </span>
                  </div>
                  {item.kind === 'mission' && item.missionId && !isDone && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/mission/${item.missionId}`)}>
                      {t('a.begin')}
                    </Button>
                  )}
                  {checkable && (
                    <button type="button" className="tl-check" aria-pressed={isDone} aria-label={l(item.title)} onClick={() => {
                        day.toggleDone(item.id);
                        daySync.itemDone(item.id, !isDone);
                      }}>
                      {isDone && <Icon name="check" size={14} />}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </ol>
          <p className="t-small muted" style={{ textAlign: 'center' }}>
            {t('day.missed')}
          </p>
        </section>

        <DevotionalCompanion timeZone={prayerLocation.loc.timeZone} placeLabel={l(prayer.label)} />

        {/* ── Daily Deen ───────────────────────────── */}
        <Section title={t('day.deen')} id="deen-h">
          <div className="deen-grid">
            <button type="button" className="card card--interactive deen-card" onClick={() => showEvidence(reflection.id)}>
              <span className="t-caption gold">{t('day.reflection')}</span>
              <p className="t-serif-italic deen-quote">{l(reflection.why)}</p>
              <span className="t-small muted">{l(reflection.question)}</span>
            </button>
            <button type="button" className="card card--interactive deen-card" onClick={() => showEvidence(dua.id)}>
              <span className="t-caption gold">{t('day.dua')}</span>
              {dua.evidence[0].arabic && (
                <p className="arabic-text deen-arabic" lang="ar">
                  {dua.evidence[0].arabic}
                </p>
              )}
              <p className="t-small">{l(dua.simple)}</p>
              <span className="t-small muted">{dua.evidence[0].ref}</span>
            </button>
            <button type="button" className="card card--interactive deen-card" onClick={() => showEvidence(learning.id)}>
              <span className="t-caption gold">{t('day.learning')}</span>
              <p style={{ fontWeight: 700 }}>{l(learning.question)}</p>
              <p className="t-small muted">{l(learning.simple).slice(0, 140)}…</p>
            </button>
          </div>
        </Section>

        {/* ── Goals ────────────────────────────────── */}
        <Section title={t('day.goals')} id="goals-h">
          <div className="card card--flat">
            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalText.trim()) return;
                const text = goalText.trim();
                const id = day.addGoal(text);
                void daySync.addGoal(text).then((sid) => sid && useDay.getState().setGoalSid(id, sid));
                setGoalText('');
              }}
            >
              <label className="sr-only" htmlFor="goal-in">
                {t('day.goalPh')}
              </label>
              <TextInput id="goal-in" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder={t('day.goalPh')} maxLength={80} />
              <IconButton icon="plus" label={t('a.save')} type="submit" />
            </form>
            {day.goals.length === 0 ? (
              <p className="t-small muted" style={{ padding: '12px 4px 0' }}>
                {t('day.noGoals')}
              </p>
            ) : (
              <ul className="list" style={{ marginTop: 8 }}>
                {day.goals.map((g) => (
                  <li key={g.id} className="list-row">
                    <button type="button" className="tl-check" aria-pressed={g.done} aria-label={g.text} onClick={() => {
                        day.toggleGoal(g.id);
                        daySync.toggleGoal(g.sid, !g.done);
                      }}>
                      {g.done && <Icon name="check" size={14} />}
                    </button>
                    <span style={{ flex: 1, textDecoration: g.done ? 'line-through' : undefined, opacity: g.done ? 0.6 : 1 }}>{g.text}</span>
                    <IconButton icon="trash" size="sm" tone="plain" label={t('a.delete')} onClick={() => {
                        day.removeGoal(g.id);
                        daySync.removeGoal(g.sid);
                      }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} />
      <ScheduleSheet open={scheduleOpen} onClose={() => setScheduleOpen(false)} remembered={memory.schedule} />
    </Page>
  );
}

/** The day as a sun arc from sunrise to sunset, with the five prayers placed on it. */
function SunArc({ times, now, reduced }: { times: Record<PrayerName, number>; now: number; reduced: boolean }) {
  const { l, isRTL } = useI18n();
  const start = times.fajr - 0.5;
  const end = times.isha + 0.8;
  const pos = (h: number) => {
    const f = Math.min(1, Math.max(0, (h - start) / (end - start)));
    const x = 20 + f * 560;
    const y = 150 - Math.sin(f * Math.PI) * 110;
    return { x: isRTL ? 600 - x : x, y };
  };
  const nowP = pos(now);
  const d = Array.from({ length: 41 }, (_, i) => {
    const p = pos(start + ((end - start) * i) / 40);
    return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="sun-arc" viewBox="0 0 600 170" aria-hidden>
      <defs>
        <linearGradient id="arc-g" x1="0" x2="1">
          <stop offset="0" stopColor="#22b3bf" />
          <stop offset="0.5" stopColor="#f6e8c6" />
          <stop offset="1" stopColor="#a88be0" />
        </linearGradient>
      </defs>
      <path d="M0 150 H600" stroke="rgb(244 236 221 / .15)" />
      <path d={d} fill="none" stroke="url(#arc-g)" strokeWidth="2" strokeDasharray="4 6" opacity="0.7" />
      {PRAYERS.map((p) => {
        const q = pos(times[p]);
        return (
          <g key={p}>
            <circle cx={q.x} cy={q.y} r="6" fill="#0b1530" stroke="#ddbe7f" strokeWidth="2" />
            <text x={q.x} y={q.y - 14} textAnchor="middle" className="sun-arc__label">
              {l(PRAYER_NAMES[p])}
            </text>
          </g>
        );
      })}
      {now > start && now < end && (
        <motion.g initial={reduced ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${nowP.x}px ${nowP.y}px` }}>
          <circle cx={nowP.x} cy={nowP.y} r="16" fill="rgb(246 232 198 / .25)" />
          <circle cx={nowP.x} cy={nowP.y} r="7" fill="#f6e8c6" />
        </motion.g>
      )}
    </svg>
  );
}

function PlaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, l } = useI18n();
  const place = useSettings((s) => s.prayerPlace);
  const setPlace = useSettings((s) => s.setPrayerPlace);
  const method = useSettings((s) => s.method);
  const setMethod = useSettings((s) => s.setMethod);
  const asr = useSettings((s) => s.asr);
  const setAsr = useSettings((s) => s.setAsr);
  const [locating, setLocating] = useState(false);
  const changePlace = (newPlace: typeof place) => {
    setPlace(newPlace);
    daySync.prayerPlace(newPlace, method, asr);
  };
  const changeMethod = (nextMethod: typeof method) => {
    setMethod(nextMethod);
    daySync.prayerPlace(place, nextMethod, asr);
  };
  const changeAsr = (nextAsr: typeof asr) => {
    setAsr(nextAsr);
    daySync.prayerPlace(place, method, nextAsr);
  };

  const useMine = () => {
    if (!navigator.geolocation) return toast(t('state.error'), { tone: 'error' });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = coarsen(pos.coords.latitude, pos.coords.longitude);
        changePlace({ custom: { ...c, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, label: t('day.useMyLocation') } });
        setLocating(false);
        onClose();
      },
      () => {
        setLocating(false);
        toast(t('state.error'), { tone: 'error' });
      },
      { maximumAge: 3_600_000, timeout: 10_000 },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('day.location')}>
      <div className="stack">
        <Button variant="secondary" icon="pin" onClick={useMine} loading={locating}>
          {t('day.useMyLocation')}
        </Button>
        <p className="t-small muted">{t('day.locationPrivacy')}</p>
        <div className="city-grid">
          {CITIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={place.cityId === c.id && !place.custom} onClick={() => changePlace({ cityId: c.id })}>
              {l(c.name)}
            </button>
          ))}
        </div>
        <Field label={t('day.method')} htmlFor="method">
          <select id="method" className="select" value={method} onChange={(e) => changeMethod(e.target.value as typeof method)}>
            <option value="auto">{t('day.method.auto')}</option>
            <option value="MWL">Muslim World League</option>
            <option value="ISNA">ISNA (North America)</option>
            <option value="Egypt">Egyptian General Authority</option>
            <option value="Makkah">Umm al-Qura, Makkah</option>
            <option value="Karachi">University of Islamic Sciences, Karachi</option>
          </select>
        </Field>
        <Field label={t('day.asr')}>
          <Segmented label={t('day.asr')} value={asr} onChange={changeAsr} options={[{ value: 'standard', label: t('day.asr.standard') }, { value: 'hanafi', label: t('day.asr.hanafi') }]} />
        </Field>
      </div>
    </Sheet>
  );
}

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const toH = (v: string) => {
  const [a, b] = v.split(':').map(Number);
  return a + (b || 0) / 60;
};

function ScheduleSheet({ open, onClose, remembered }: { open: boolean; onClose: () => void; remembered: boolean }) {
  const { t } = useI18n();
  const prefs = useDay((s) => s.prefs);
  const setPrefs = useDay((s) => s.setPrefs);
  const c = prefs.commitments[0];
  return (
    <Sheet open={open} onClose={onClose} title={t('day.schedule')} footer={<Button block onClick={onClose}>{t('a.done')}</Button>}>
      <div className="stack">
        <p className="t-small muted">{t('day.scheduleSub')}</p>
        {!remembered && <p className="demo-note">{t('day.scheduleNotRemembered')}</p>}
        <div className="two-col">
          <Field label={t('day.wake')} htmlFor="wake">
            <input id="wake" type="time" className="input" value={hhmm(prefs.wake)} onChange={(e) => setPrefs({ wake: toH(e.target.value) })} />
          </Field>
          <Field label={t('day.sleep')} htmlFor="sleep">
            <input id="sleep" type="time" className="input" value={hhmm(prefs.sleep)} onChange={(e) => setPrefs({ sleep: toH(e.target.value) })} />
          </Field>
        </div>
        {c && (
          <div className="two-col">
            <Field label={t('day.from', { what: t('day.commitment') })} htmlFor="cs">
              <input id="cs" type="time" className="input" value={hhmm(c.start)} onChange={(e) => setPrefs({ commitments: [{ ...c, start: toH(e.target.value) }] })} />
            </Field>
            <Field label={t('day.to')} htmlFor="ce">
              <input id="ce" type="time" className="input" value={hhmm(c.end)} onChange={(e) => setPrefs({ commitments: [{ ...c, end: toH(e.target.value) }] })} />
            </Field>
          </div>
        )}
        <Field label={t('day.studyTime')}>
          <Segmented label={t('day.studyTime')} value={prefs.studyTime} onChange={(v) => setPrefs({ studyTime: v })} options={(['morning', 'afternoon', 'evening'] as const).map((v) => ({ value: v, label: t(`day.study.${v}`) }))} />
        </Field>
        <Field label={t('day.minutes')}>
          <Segmented label={t('day.minutes')} value={String(prefs.learningMinutes)} onChange={(v) => setPrefs({ learningMinutes: Number(v) })} options={['10', '20', '30', '45'].map((v) => ({ value: v, label: t('time.min', { n: Number(v) }) }))} />
        </Field>
      </div>
    </Sheet>
  );
}
