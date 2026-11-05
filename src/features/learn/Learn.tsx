/**
 * LEARN — knowledge with its sources. Every card opens the trust layer:
 * answer, evidence, context, where scholars differ, and when to ask a scholar.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { TopicId } from '@/domain/types';
import { KNOWLEDGE } from '@/content/knowledge';
import { TOPICS } from '@/content/topics';
import { MISSIONS } from '@/content/missions';
import { searchKnowledge } from '@/services/knowledge';
import { useLibrary, type LibraryItem } from '@/api/content';
import { Bar, Chip, ConfidenceBadge, DemoNote, EmptyState, Section, TextInput } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useJourney } from '@/app/hooks';
import { useLearner } from '@/store/learner';
import { useProgress } from '@/store/progress';
import { useTutor } from '@/store/tutor';
import './learn.css';

export default function Learn() {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const showEvidence = useTutor((s) => s.showEvidence);
  const saved = useProgress((s) => s.saved);
  const model = useLearner((s) => s.model);
  const journey = useJourney();

  // Online: the server's library (published + clearly-labelled demo). Offline: the bundled demo entries.
  const library = useLibrary(q);
  const items = useMemo<LibraryItem[]>(() => {
    const base: LibraryItem[] =
      library.items ??
      (q.trim().length > 1 ? searchKnowledge(q, { limit: 20 }).map((h) => h.entry) : KNOWLEDGE).map((k) => ({
        id: k.id,
        question: k.question,
        simple: k.simple,
        confidence: k.confidence,
        topics: k.topics,
        refs: k.evidence.map((e) => e.ref),
        status: k.reviewStatus === 'reviewed' ? 'published' : 'demo',
      }));
    return topic === 'all' ? base : base.filter((k) => k.topics.includes(topic));
  }, [q, topic, library.items]);

  const topicMissions = topic === 'all' ? [] : MISSIONS.filter((m) => m.topic === topic);

  return (
    <Page eyebrow={t('nav.learn')} title={t('learn.title')} sub={t('learn.sub')}>
      <div className="stack" style={{ '--stack-gap': '24px' } as React.CSSProperties}>
        <div className="learn-search">
          <Icon name="search" size={18} />
          <label htmlFor="learn-q" className="sr-only">
            {t('learn.search')}
          </label>
          <TextInput id="learn-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('learn.search')} />
        </div>
        <div className="row wrap" role="group" aria-label={t('learn.topics')} style={{ '--row-gap': '6px' } as React.CSSProperties}>
          <Chip onClick={() => setTopic('all')} pressed={topic === 'all'}>
            {t('learn.all')}
          </Chip>
          {TOPICS.map((tp) => (
            <Chip key={tp} onClick={() => setTopic(tp)} pressed={topic === tp}>
              {t(`prof.topic.${tp}`)}
            </Chip>
          ))}
        </div>

        {(topic === 'all' || topic === 'quran') && (
          <div
            className="card card--interactive"
            onClick={() => navigate('/quran')}
            style={{
              background: 'linear-gradient(135deg, rgba(19, 32, 74, 0.8) 0%, rgba(11, 21, 48, 0.95) 100%)',
              border: '1px solid var(--gold-500)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(201, 164, 92, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--gold-300)' }}>
                <Icon name="quran" size={28} />
              </div>
              <div>
                <strong style={{ fontSize: '1.2rem', color: 'var(--gold-300)', display: 'block' }}>{t('nav.quran')}</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--sand-100)', opacity: 0.85 }}>{t('quran.sub')}</span>
              </div>
            </div>
            <Icon name="forward" size={20} className="gold" />
          </div>
        )}

        {topic !== 'all' && (
          <div className="card card--flat learn-topic">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{t(`prof.topic.${topic}`)}</strong>
              <span className="t-small muted">{Math.round((model.topics[topic]?.mastery ?? 0) * 100)}%</span>
            </div>
            <Bar value={model.topics[topic]?.mastery ?? 0} label={t(`prof.topic.${topic}`)} />
            {topicMissions.length > 0 && (
              <>
                <p className="t-caption muted">{t('learn.missions')}</p>
                <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
                  {topicMissions.map((m) => (
                    <Chip key={m.id} icon={journey.completed.includes(m.id) ? 'check' : journey.unlocked.has(m.location) ? 'play' : 'moon'} tone={journey.completed.includes(m.id) ? 'emerald' : undefined} onClick={() => navigate(`/mission/${m.id}`)}>
                      {t('m.number', { n: m.number })} · {l(m.title)}
                    </Chip>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Section title={t('learn.count', { n: items.length })} id="kn">
          {items.length === 0 ? (
            <EmptyState icon="search" title={t('ex.noResults', { q })} />
          ) : (
            <div className="learn-grid">
              <AnimatePresence initial={false}>
                {items.map((k) => (
                  <motion.button key={k.id} layout type="button" className="card card--interactive learn-card" onClick={() => showEvidence(k.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <ConfidenceBadge level={k.confidence} />
                      <span className="row" style={{ gap: 6 }}>
                        {k.status === 'demo' ? <span className="chip chip--demo" style={{ fontSize: '0.7rem' }}>{t('state.demo')}</span> : <span className="chip chip--emerald" style={{ fontSize: '0.7rem' }}>{t('learn.reviewed')}</span>}
                        {saved.includes(k.id) && <Icon name="check" size={16} className="gold" />}
                      </span>
                    </div>
                    <h3 className="learn-card__q">{l(k.question)}</h3>
                    <p className="t-small muted learn-card__a">{l(k.simple)}</p>
                    <div className="row wrap" style={{ '--row-gap': '6px', marginTop: 'auto' } as React.CSSProperties}>
                      {k.refs.slice(0, 2).map((ref) => (
                        <span key={ref} className="chip chip--quiet" style={{ fontSize: '0.75rem' }}>
                          {ref}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Section>
        <DemoNote>{library.source === 'server' ? t('learn.sourceServer') : t('learn.sourceBundled')}</DemoNote>
      </div>
    </Page>
  );
}
