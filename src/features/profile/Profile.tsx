/**
 * PROFILE — a learning journey, not an XP counter.
 * Strengths, topics to revisit, artifacts, places, preferences, circles,
 * saved knowledge and reflections — plus control over what SAJA remembers.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CharacterLook, Modality, TopicId } from '@/domain/types';
import { bestModality, strengths, topicsToRevisit } from '@/domain/adaptive';
import { LOCATIONS, LOCATION_BY_ID } from '@/content/world';
import { MISSION_BY_ID, MISSIONS } from '@/content/missions';
import { CIRCLES } from '@/content/community';
import { getKnowledge } from '@/content/knowledge';
import { Bar, Button, Chip, Dialog, EmptyState, IconButton, Section, Segmented, Sheet, Switch, Tile, toast } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useIntro } from '@/app/intro';
import { useProfile } from '@/store/profile';
import { useProgress } from '@/store/progress';
import { useLearner } from '@/store/learner';
import { useSettings, type MotionPref } from '@/store/settings';
import { useCommunity } from '@/store/community';
import { useJoinedCircleIds } from '@/features/community/live';
import { useTutor } from '@/store/tutor';
import { useDay } from '@/store/day';
import { useScholar } from '@/store/scholar';
import { Character } from '@/features/character/Character';
import { CharacterCreator, CharacterPreview } from '@/features/character/CharacterCreator';
import { GuardianGate } from '@/features/community/GuardianGate';
import { TOPICS } from '@/content/topics';
import { ChildGuardianPanel, GuardianPanel } from './GuardianServer';
import { ModeBadge } from '@/features/account/ConnectionStatus';
import { useConnection } from '@/store/connection';
import { signOut } from '@/api/sync';
import './profile.css';

export default function Profile() {
  const { t, l, intl } = useI18n();
  const navigate = useNavigate();
  const profile = useProfile((s) => s.profile)!;
  const updateProfile = useProfile((s) => s.updateProfile);
  const model = useLearner((s) => s.model);
  const setDifficulty = useLearner((s) => s.setDifficulty);
  const setPreferred = useLearner((s) => s.setPreferred);
  const results = useProgress((s) => s.results);
  const achievements = useProgress((s) => s.achievements);
  const saved = useProgress((s) => s.saved);
  const reflections = useProgress((s) => s.reflections);
  const deleteReflection = useProgress((s) => s.deleteReflection);
  const joined = useJoinedCircleIds();
  const showEvidence = useTutor((s) => s.showEvidence);
  const [editing, setEditing] = useState(false);
  const [look, setLook] = useState<CharacterLook>(profile.look);
  const [resetAsk, setResetAsk] = useState(false);
  const online = useConnection((s) => s.status === 'online');
  const me = useConnection((s) => s.me);

  const completed = Object.values(results).sort((a, b) => b.completedAt - a.completedAt);
  const str = strengths(model);
  const rev = topicsToRevisit(model);
  const best = bestModality(model);
  const places = LOCATIONS.filter((x) => achievements.some((a) => a.id === `place-${x.id}`) || x.unlock.kind === 'start');
  const artifacts = achievements.filter((a) => a.kind !== 'place');

  return (
    <Page eyebrow={t('prof.since', { date: new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }).format(profile.createdAt) })} title={t('prof.title')}>
      <div className="prof">
        <aside className="prof-hero card card--raised">
          <CharacterPreview look={profile.look} name={profile.name} />
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <Chip tone="gold" icon="lantern">
              {t('world.lanterns', { n: completed.length, total: MISSIONS.length })}
            </Chip>
            {profile.ageBand === 'child' && (
              <Chip tone="emerald" icon="shield">
                {t('prof.kidsMode')}
              </Chip>
            )}
          </div>
          <Button variant="secondary" icon="edit" onClick={() => { setLook(profile.look); setEditing(true); }}>
            {t('prof.editCharacter')}
          </Button>
          <Tile icon="eye" title={t('mem.title')} sub={online ? t('mem.subOnline') : t('mem.sub')} onClick={() => navigate('/profile/memory')} trailing={<Icon name="forward" size={18} className="flip-rtl muted" />} />
          {online && (
            <Tile icon="key" title={t('acc.title')} sub={me && !me.user.isGuest ? me.user.email : t('acc.keepSub')} onClick={() => navigate('/account')} trailing={<Icon name="forward" size={18} className="flip-rtl muted" />} />
          )}
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <ModeBadge />
          </div>
        </aside>

        <div className="prof-main">
          <Section title={t('prof.knowledge')} id="knowledge">
            <div className="card know-grid">
              {TOPICS.map((tp) => {
                const m = model.topics[tp]?.mastery ?? 0;
                return (
                  <div key={tp} className="know-row">
                    <span className="know-row__label">{t(`prof.topic.${tp}`)}</span>
                    <Bar value={m} label={t(`prof.topic.${tp}`)} />
                    <span className="know-row__pct">{Math.round(m * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="prof-two">
            <Section title={t('prof.strengths')} id="str">
              <div className="card card--flat">
                {str.length ? (
                  <div className="row wrap">{str.map((s) => <Chip key={s} tone="emerald" icon="star">{t(`prof.topic.${s}`)}</Chip>)}</div>
                ) : (
                  <p className="t-small muted">{t('prof.strengthsEmpty')}</p>
                )}
              </div>
            </Section>
            <Section title={t('prof.revisit')} id="rev">
              <div className="card card--flat">
                {rev.length ? (
                  <div className="row wrap">{rev.map((s: TopicId) => <Chip key={s} icon="refresh" onClick={() => navigate('/learn')}>{t(`prof.topic.${s}`)}</Chip>)}</div>
                ) : (
                  <p className="t-small muted">{t('prof.revisitEmpty')}</p>
                )}
              </div>
            </Section>
          </div>

          <Section title={t('prof.achievements')} id="ach">
            {artifacts.length === 0 ? (
              <div className="card card--flat">
                <EmptyState icon="star" title={t('prof.achievementsEmpty')} />
              </div>
            ) : (
              <div className="artifact-grid">
                {artifacts.map((a) => {
                  const m = a.missionId ? MISSION_BY_ID[a.missionId] : undefined;
                  return (
                    <div key={a.id} className="artifact">
                      <span className="artifact__arch">
                        <Star size={18} color="currentColor" />
                      </span>
                      <strong>{m ? l(m.reward.name) : a.id}</strong>
                      <span className="t-small muted">{m ? l(LOCATION_BY_ID[m.location].name) : ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <div className="prof-two">
            <Section title={t('prof.completed')} id="done">
              <div className="card card--flat">
                {completed.length === 0 ? (
                  <p className="t-small muted">{t('prof.achievementsEmpty')}</p>
                ) : (
                  <ul className="list">
                    {completed.map((r) => {
                      const m = MISSION_BY_ID[r.missionId];
                      return (
                        <li key={r.missionId} className="list-row">
                          <Icon name="check" size={16} className="gold" />
                          <span style={{ flex: 1 }}>{l(m.title)}</span>
                          <span className="t-small muted">{t(`m.modeName.${r.modality}`)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Section>
            <Section title={t('prof.places')} id="places">
              <div className="card card--flat row wrap">
                {places.map((p) => (
                  <Chip key={p.id} icon="lantern">
                    {l(p.name)}
                  </Chip>
                ))}
              </div>
            </Section>
          </div>

          <Section title={t('prof.prefs')} id="prefs">
            <div className="card stack">
              <div className="pref-row">
                <span>{t('prof.bestStyle')}</span>
                <Chip tone="turquoise" icon="sparkle">
                  {t(`m.modeName.${best}`)}
                </Chip>
              </div>
              <div className="pref-row">
                <span>{t('ob.styleQ')}</span>
                <Segmented
                  label={t('ob.styleQ')}
                  value={profile.modality}
                  onChange={(m: Modality) => {
                    updateProfile({ modality: m });
                    setPreferred(m);
                  }}
                  options={(['hands-on', 'visual', 'story', 'guided'] as Modality[]).map((m) => ({ value: m, label: t(`m.modeName.${m}`) }))}
                />
              </div>
              <div className="pref-row">
                <span>{t('prof.difficulty')}</span>
                <Segmented label={t('prof.difficulty')} value={model.difficulty} onChange={setDifficulty} options={(['gentle', 'balanced', 'challenge'] as const).map((d) => ({ value: d, label: t(`prof.diff.${d}`) }))} />
              </div>
            </div>
          </Section>

          <div className="prof-two">
            <Section title={t('prof.circles')} id="circles">
              <div className="card card--flat">
                {joined.length === 0 ? (
                  <Button variant="ghost" icon="community" onClick={() => navigate('/circles')}>
                    {t('world.findCircle')}
                  </Button>
                ) : (
                  <ul className="list">
                    {CIRCLES.filter((c) => joined.includes(c.id)).map((c) => (
                      <li key={c.id}>
                        <button type="button" className="more-row" onClick={() => navigate(`/circles/${c.id}`)}>
                          <Icon name="community" size={18} />
                          <span style={{ flex: 1, textAlign: 'start' }}>{l(c.name)}</span>
                          <Icon name="forward" size={16} className="flip-rtl muted" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
            <Section title={t('prof.saved')} id="saved">
              <div className="card card--flat">
                {saved.length === 0 ? (
                  <p className="t-small muted">{t('prof.savedEmpty')}</p>
                ) : (
                  <div className="row wrap">
                    {saved.map((id) => (
                      <Chip key={id} icon="layers" onClick={() => showEvidence(id)}>
                        {l(getKnowledge(id)?.question)}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          </div>

          {reflections.length > 0 && (
            <Section title={t('prof.reflections')} id="refl">
              <div className="stack">
                {reflections.map((r) => (
                  <div key={r.id} className="card card--flat row" style={{ alignItems: 'flex-start' }}>
                    <Star size={14} color="var(--gold-300)" />
                    <div style={{ flex: 1 }}>
                      <p className="t-small muted">{new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(r.at)}</p>
                      {r.lines.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                    <IconButton icon="trash" size="sm" tone="plain" label={t('a.delete')} onClick={() => deleteReflection(r.id)} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Settings onReset={() => setResetAsk(true)} />
          {online ? profile.ageBand === 'adult' ? <GuardianPanel /> : <ChildGuardianPanel /> : profile.ageBand === 'child' && <GuardianControls />}
        </div>
      </div>

      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title={t('prof.editCharacter')}
        footer={
          <Button
            block
            onClick={() => {
              updateProfile({ look });
              setEditing(false);
            }}
          >
            {t('a.save')}
          </Button>
        }
      >
        <div className="stack">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Character look={look} size={110} />
          </div>
          <CharacterCreator look={look} onChange={setLook} />
        </div>
      </Sheet>

      <Dialog
        open={resetAsk}
        onClose={() => setResetAsk(false)}
        title={t('prof.resetAll')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setResetAsk(false)}>
              {t('a.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                // Online, starting over also ends this device's session (an account's journey stays in the account).
                if (online) await signOut();
                useProgress.getState().reset();
                useLearner.getState().reset();
                useCommunity.getState().reset();
                useTutor.getState().clear();
                useDay.getState().forgetSchedule();
                useScholar.setState({ questions: useScholar.getState().questions.filter((q) => q.id.startsWith('sample')) });
                useProfile.getState().reset();
                navigate('/welcome', { replace: true });
              }}
            >
              {t('prof.resetAll')}
            </Button>
          </>
        }
      >
        {t('prof.resetConfirm')}
      </Dialog>
    </Page>
  );
}

function Settings({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  const locale = useSettings((s) => s.locale);
  const setLocale = useSettings((s) => s.setLocale);
  const motion = useSettings((s) => s.motion);
  const setMotion = useSettings((s) => s.setMotion);
  const setIntro = useIntro((s) => s.set);
  return (
    <Section title={t('prof.settings')} id="settings">
      <div className="card stack">
        <div className="pref-row">
          <span>
            <Icon name="globe" size={16} /> {t('prof.language')}
          </span>
          <Segmented label={t('prof.language')} value={locale} onChange={setLocale} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
        </div>
        <div className="pref-row">
          <span>{t('prof.motion')}</span>
          <Segmented label={t('prof.motion')} value={motion} onChange={(m: MotionPref) => setMotion(m)} options={(['system', 'reduced', 'full'] as MotionPref[]).map((m) => ({ value: m, label: t(`prof.motion.${m}`) }))} />
        </div>
        <div className="row wrap">
          <Button variant="secondary" icon="star" onClick={() => setIntro('full')}>
            {t('prof.replayIntro')}
          </Button>
          <span className="spacer" />
          <Button variant="danger" icon="trash" onClick={onReset}>
            {t('prof.resetAll')}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function GuardianControls() {
  const { t, l } = useI18n();
  const parental = useProfile((s) => s.parental);
  const setParental = useProfile((s) => s.setParental);
  const [unlocked, setUnlocked] = useState(false);
  const [gate, setGate] = useState(false);
  return (
    <Section title={t('guard.title')} id="guardian">
      <div className="card stack">
        <p className="t-small muted">{t('guard.sub')}</p>
        <p className="t-caption muted">
          <Icon name="info" size={14} /> {t('guard.localOnly')}
        </p>
        <div className="safety-note" style={{ borderRadius: 14 }}>
          <Icon name="shield" size={16} />
          <span>
            <strong>{t('guard.always')}:</strong> {t('guard.alwaysList')}
          </span>
        </div>
        {!unlocked ? (
          <Button variant="secondary" icon="lock" onClick={() => setGate(true)}>
            {t('guard.gate')}
          </Button>
        ) : (
          <>
            <div className="pref-row">
              <span>{t('guard.approve')}</span>
              <Switch checked={parental.approveCircles} onChange={(v) => setParental({ approveCircles: v })} label={t('guard.approve')} />
            </div>
            <div className="pref-row">
              <span>
                {t('guard.quickOnly')}
                <span className="t-small muted" style={{ display: 'block' }}>
                  {t('guard.quickOnlyBody')}
                </span>
              </span>
              <Switch checked={parental.quickRepliesOnly} onChange={(v) => setParental({ quickRepliesOnly: v })} label={t('guard.quickOnly')} />
            </div>
            <p className="t-caption muted">{t('guard.timeOffline')}</p>
            <div className="pref-row">
              <span>{t('guard.time')}</span>
              <Segmented label={t('guard.time')} value={String(parental.dailyMinutes)} onChange={(v) => setParental({ dailyMinutes: Number(v) })} options={['0', '30', '45', '60'].map((v) => ({ value: v, label: v === '0' ? t('guard.timeNone') : t('time.min', { n: Number(v) }) }))} />
            </div>
            <div>
              <p className="t-caption muted">{t('guard.approved')}</p>
              <div className="row wrap" style={{ marginTop: 6 }}>
                {parental.approvedCircles.length === 0 ? <span className="t-small muted">—</span> : parental.approvedCircles.map((id) => <Chip key={id}>{l(CIRCLES.find((c) => c.id === id)!.name)}</Chip>)}
              </div>
            </div>
          </>
        )}
      </div>
      <GuardianGate
        open={gate}
        onClose={() => setGate(false)}
        onPass={() => {
          setGate(false);
          setUnlocked(true);
          toast('✓');
        }}
      />
    </Section>
  );
}
