/**
 * EXPLORE — discovering a world, not browsing a database. The map leads;
 * places, paths, stories, circles and this week's gatherings follow.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { L10n, Mission, Purpose } from '@/domain/types';
import { LOCATIONS } from '@/content/world';
import { MISSIONS } from '@/content/missions';
import { CIRCLES, MEMBERS } from '@/content/community';
import { KNOWLEDGE } from '@/content/knowledge';
import { HADITHS } from '@/content/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { Chip, EmptyState, Section, TextInput } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n, type TKey } from '@/i18n';
import { Page } from '@/app/Page';
import { useJourney } from '@/app/hooks';
import { usePolicy, useProfile } from '@/store/profile';
import { useProgress } from '@/store/progress';
import { useTutor } from '@/store/tutor';
import { WorldMapDiagram } from '@/features/world/WorldMap';
import { Avatar } from '@/features/character/Character';
import { TOPICS } from '@/content/topics';
import './explore.css';

const PATHS: { key: TKey; for: Purpose[]; missions: string[] }[] = [
  { key: 'ex.path.new', for: ['new-muslim'], missions: ['m-water-path', 'm-five-pauses', 'm-words-of-peace', 'm-pillars'] },
  { key: 'ex.path.explore', for: ['exploring'], missions: ['m-words-of-peace', 'm-first-word', 'm-pillars', 'm-six-lights'] },
  { key: 'ex.path.kids', for: ['child'], missions: ['m-words-of-peace', 'm-water-path', 'm-dropped-lunch', 'm-evening-stillness'] },
  { key: 'ex.path.deeper', for: ['learn-more'], missions: ['m-first-word', 'm-caravan-stars', 'm-summit-names', 'm-six-lights'] },
];

export default function Explore() {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const journey = useJourney();
  const profile = useProfile((s) => s.profile)!;
  const policy = usePolicy();
  const here = useProgress((s) => s.location);
  const achievements = useProgress((s) => s.achievements);
  const showEvidence = useTutor((s) => s.showEvidence);
  const [q, setQ] = useState('');

  const match = (s: L10n) => !q.trim() || `${s.en} ${s.ar}`.toLowerCase().includes(q.trim().toLowerCase());
  const places = LOCATIONS.filter((x) => match(x.name) || match(x.purpose));
  const missions = MISSIONS.filter((m) => match(m.title) || match(m.summary));
  const topics = KNOWLEDGE.filter((k) => match(k.question));
  const stories = MISSIONS.filter((m) => m.reward.kind === 'story');
  const paths = useMemo(() => [...PATHS].sort((a, b) => Number(b.for.includes(profile.purpose)) - Number(a.for.includes(profile.purpose))), [profile.purpose]);
  const circles = CIRCLES.filter((c) => c.ageBand === policy.ageBand);
  const empty = q.trim() && places.length + missions.length + topics.length === 0;

  const walk = (id: string) => navigate('/', { state: { focus: id } });
  const missionState = (m: Mission) => (journey.completed.includes(m.id) ? 'done' : journey.unlocked.has(m.location) ? 'open' : 'asleep');

  return (
    <Page eyebrow={t('nav.explore')} title={t('ex.title')} sub={t('ex.sub')} wide>
      <div className="stack" style={{ '--stack-gap': '32px' } as React.CSSProperties}>
        <div className="learn-search" style={{ maxWidth: 640 }}>
          <Icon name="search" size={18} />
          <label htmlFor="ex-q" className="sr-only">
            {t('ex.search')}
          </label>
          <TextInput id="ex-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ex.search')} />
        </div>

        {empty ? (
          <EmptyState icon="compass" title={t('ex.noResults', { q })} />
        ) : q.trim() ? (
          <div className="stack">
            {missions.map((m) => (
              <button key={m.id} type="button" className="card card--interactive row" onClick={() => navigate(`/mission/${m.id}`)}>
                <Icon name={missionState(m) === 'asleep' ? 'moon' : 'play'} size={18} />
                <span style={{ flex: 1 }}>
                  {t('m.number', { n: m.number })} · <strong>{l(m.title)}</strong>
                </span>
              </button>
            ))}
            {topics.map((k) => (
              <button key={k.id} type="button" className="card card--interactive row" onClick={() => showEvidence(k.id)}>
                <Icon name="layers" size={18} />
                <span style={{ flex: 1 }}>{l(k.question)}</span>
              </button>
            ))}
            {places.map((p) => (
              <button key={p.id} type="button" className="card card--interactive row" onClick={() => walk(p.id)}>
                <Icon name="pin" size={18} />
                <span style={{ flex: 1 }}>{l(p.name)}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="ex-hero">
              <WorldMapDiagram current={here} onSelect={(id) => walk(id)} />
            </div>

            <section className="ex-hadith" aria-labelledby="ex-hadith-title">
              <div className="ex-hadith__arch" aria-hidden>
                <Icon name="quote" size={24} />
              </div>
              <div className="ex-hadith__copy">
                <span className="t-caption eyebrow">{t('ex.hadithEyebrow')}</span>
                <h2 id="ex-hadith-title" className="t-h2">
                  {t('ex.hadith')}
                </h2>
                <p className="muted">{t('ex.hadithSub')}</p>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Chip tone="quiet">{t('hadith.count', { n: HADITHS.length })}</Chip>
                  <Chip tone="quiet">{t('hadith.activitiesCount', { n: HADITH_ACTIVITIES.length })}</Chip>
                </div>
              </div>
              <div className="ex-hadith__actions">
                <button type="button" className="btn btn--secondary" onClick={() => navigate('/hadith')}>
                  <Icon name="learn" size={18} />
                  {t('ex.hadithOpen')}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => navigate('/hadith/discover')}>
                  <Icon name="compass" size={18} />
                  {t('ex.hadithDiscover')}
                </button>
              </div>
            </section>

            <Section title={t('ex.places')} id="places">
              <div className="ex-rail">
                {LOCATIONS.map((p) => {
                  const asleep = !journey.unlocked.has(p.id);
                  return (
                    <button key={p.id} type="button" className="ex-place" data-asleep={asleep || undefined} onClick={() => walk(p.id)}>
                      <span className="ex-place__arch">
                        <Icon name={asleep ? 'moon' : 'lantern'} size={24} />
                      </span>
                      <strong>{l(p.name)}</strong>
                      <span className="t-small muted">{l(p.purpose)}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title={t('ex.paths')} id="paths">
              <div className="ex-grid">
                {paths.map((p) => (
                  <div key={p.key} className="card ex-path" data-mine={p.for.includes(profile.purpose) || undefined}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <h3 className="t-h3">{t(p.key)}</h3>
                      <span className="t-small muted">{t('ex.missionsCount', { n: p.missions.length })}</span>
                    </div>
                    <ol className="ex-path__steps">
                      {p.missions.map((id) => {
                        const m = MISSIONS.find((x) => x.id === id)!;
                        const st = missionState(m);
                        return (
                          <li key={id} data-state={st}>
                            <button type="button" onClick={() => navigate(`/mission/${id}`)}>
                              <span className="ex-dot" aria-hidden>
                                {st === 'done' ? <Icon name="check" size={12} /> : st === 'asleep' ? <Icon name="moon" size={12} /> : m.number}
                              </span>
                              {l(m.title)}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </Section>

            <div className="ex-two">
              <Section title={t('ex.stories')} id="stories">
                <div className="stack">
                  {stories.map((m) => {
                    const got = achievements.some((a) => a.id === m.reward.id);
                    return (
                      <button key={m.id} type="button" className="card card--interactive ex-story" data-locked={!got || undefined} onClick={() => (got ? showEvidence(m.knowledge[0]) : navigate(`/mission/${m.id}`))}>
                        <Icon name={got ? 'quote' : 'lock'} size={20} />
                        <span style={{ flex: 1 }}>
                          <strong>{l(m.reward.name)}</strong>
                          <span className="t-small muted" style={{ display: 'block' }}>
                            {got ? l(m.summary) : `${t('ex.storyLocked')} · ${t('m.number', { n: m.number })}`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
              <Section title={t('ex.events')} id="events">
                <div className="stack">
                  {(policy.ageBand === 'child' ? [['ex.event1', 'ex.event1Sub'] as const] : [['ex.event2', 'ex.event2Sub'] as const, ['ex.event1', 'ex.event1Sub'] as const])
                    .slice(0, policy.ageBand === 'adult' ? 1 : 2)
                    .map(([a, b]) => (
                      <div key={a} className="card card--flat row">
                        <Icon name="clock" size={20} />
                        <span>
                          <strong>{t(a)}</strong>
                          <span className="t-small muted" style={{ display: 'block' }}>
                            {t(b)}
                          </span>
                        </span>
                      </div>
                    ))}
                </div>
              </Section>
            </div>

            <Section title={t('ex.topics')} id="topics">
              <div className="row wrap" style={{ '--row-gap': '8px' } as React.CSSProperties}>
                {TOPICS.map((tp) => (
                  <Chip key={tp} icon="learn" onClick={() => navigate('/learn')}>
                    {t(`prof.topic.${tp}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t('ex.people')} id="people">
              <div className="ex-rail">
                {circles.map((c) => (
                  <button key={c.id} type="button" className="ex-person" onClick={() => navigate(`/circles/${c.id}`)}>
                    <Avatar look={MEMBERS[c.mentorId].look} size={52} gold />
                    <strong>{l(c.name)}</strong>
                    <span className="t-small muted">
                      {MEMBERS[c.mentorId].name} · {t('com.mentor')}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </Page>
  );
}
