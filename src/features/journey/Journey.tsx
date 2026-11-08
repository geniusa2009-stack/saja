/**
 * JOURNEY — your path so far, and where it leads. A winding road through
 * chapters and places; each lit stone is a mission you've walked.
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CHAPTERS, LOCATIONS } from '@/content/world';
import { missionsAt } from '@/content/missions';
import { missionsUntilUnlock } from '@/domain/world';
import { Chip, useReducedMotion } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useJourney } from '@/app/hooks';
import { useProgress } from '@/store/progress';
import { useProfile } from '@/store/profile';
import { Avatar } from '@/features/character/Character';
import { NextSteps } from '@/features/personalization/NextSteps';
import { PathRoadmap } from '@/features/personalization/PathRoadmap';
import './journey.css';

export default function Journey() {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const journey = useJourney();
  const here = useProgress((s) => s.location);
  const profile = useProfile((s) => s.profile)!;
  const done = new Set(journey.completed);
  const nextId = journey.next?.mission.id;

  return (
    <Page eyebrow={t('world.lanterns', { n: journey.lanterns, total: journey.total })} title={t('jr.title')} sub={t('jr.sub')}>
      <PathRoadmap />
      <NextSteps />
      <div className="jr">
        {CHAPTERS.map((ch) => {
          const locs = LOCATIONS.filter((x) => x.chapter === ch.n);
          const open = locs.some((x) => journey.unlocked.has(x.id));
          return (
            <section key={ch.n} className="jr-chapter" data-open={open || undefined} aria-labelledby={`ch-${ch.n}`}>
              <header className="jr-chapter__head">
                <span className="t-caption gold">{t('jr.chapter', { n: ch.n })}</span>
                <h2 id={`ch-${ch.n}`} className="t-h1">
                  {l(ch.name)}
                </h2>
              </header>
              {locs.map((loc) => {
                const asleep = !journey.unlocked.has(loc.id);
                const left = missionsUntilUnlock(loc, { completed: journey.completed });
                return (
                  <motion.div
                    key={loc.id}
                    className="jr-place"
                    data-asleep={asleep || undefined}
                    initial={reduced ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }}
                  >
                    <div className="jr-place__node" aria-hidden>
                      <Icon name={asleep ? 'moon' : 'lantern'} size={18} />
                    </div>
                    <div className="jr-place__card card">
                      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                        <h3 className="t-h3">{l(loc.name)}</h3>
                        {here === loc.id && (
                          <span className="row" style={{ '--row-gap': '6px' } as React.CSSProperties}>
                            <Avatar look={profile.look} size={30} gold />
                            <span className="t-small gold">{t('jr.current')}</span>
                          </span>
                        )}
                      </div>
                      <p className="t-small muted">{asleep ? (left === 1 ? t('world.asleepOne') : t('world.asleepMany', { n: left })) : l(loc.purpose)}</p>
                      <ol className="jr-stones">
                        {missionsAt(loc.id).map((m) => {
                          const isDone = done.has(m.id);
                          const isNext = m.id === nextId;
                          return (
                            <li key={m.id}>
                              <button type="button" className="jr-stone" data-done={isDone || undefined} data-next={isNext || undefined} disabled={asleep} onClick={() => navigate(`/mission/${m.id}`)}>
                                <span className="jr-stone__dot">{isDone ? <Icon name="check" size={14} /> : isNext ? <Star size={12} color="currentColor" /> : m.number}</span>
                                <span className="jr-stone__text">
                                  <strong>{l(m.title)}</strong>
                                  <span className="t-small muted">
                                    {t('m.number', { n: m.number })} · {t('m.minutes', { n: m.minutes })}
                                  </span>
                                </span>
                                {isDone && <Chip tone="gold">{l(m.reward.name)}</Chip>}
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </motion.div>
                );
              })}
            </section>
          );
        })}
      </div>
    </Page>
  );
}
