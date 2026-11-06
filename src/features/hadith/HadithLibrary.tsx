import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { AgeBand, TopicId } from '@/domain/types';
import type { HadithCollection } from '@/domain/hadith';
import { filterHadith } from '@/domain/hadith';
import { HADITHS, HADITH_BY_ID } from '@/content/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { useHadithLibrary, hadithDiscoverPath, hadithPath } from '@/api/hadith';
import { Button, Chip, DemoNote, EmptyState, Section, StarLoader, TextInput } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useHadith } from '@/store/hadith';
import { CollectionChip, HadithStatusBadge, SaveHadithButton, Topics } from './shared';
import './hadith.css';

const TOPIC_ORDER: TopicId[] = ['prayer', 'purification', 'quran', 'character', 'beliefs', 'terminology', 'fasting', 'history'];
const COLLECTIONS: HadithCollection[] = ['bukhari', 'muslim', 'tirmidhi'];
const AGE_BANDS: AgeBand[] = ['child', 'teen', 'adult'];

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hadith-filter-row">
      <span className="t-caption muted">{label}</span>
      <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

export default function HadithLibrary() {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const library = useHadithLibrary();
  const saved = useHadith((s) => s.saved);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const [collection, setCollection] = useState<HadithCollection | 'all'>('all');
  const [ageBand, setAgeBand] = useState<AgeBand | 'all'>('all');
  const [savedOnly, setSavedOnly] = useState(false);

  const items = useMemo(() => (library.state === 'ready' ? library.data.items : []), [library]);
  const topics = useMemo(() => TOPIC_ORDER.filter((tp) => items.some((i) => i.record.topics.includes(tp))), [items]);
  const filtered = useMemo(() => {
    const records = items.map((i) => i.record);
    const visible = filterHadith(records, { query: q, topic, collection, ageBand, savedOnly, saved });
    const byId = new Map(items.map((i) => [i.record.id, i]));
    return visible.map((r) => byId.get(r.id)!).filter(Boolean);
  }, [items, q, topic, collection, ageBand, savedOnly, saved]);

  const featured = items.find((i) => i.record.id === 'h-bukhari-1') ?? items[0] ?? { record: HADITH_BY_ID['h-bukhari-1'] ?? HADITHS[0], provenance: { source: 'bundled-demo' as const, status: 'demo' as const, version: null, reviews: [] } };
  const anyFilter = !!q.trim() || topic !== 'all' || collection !== 'all' || ageBand !== 'all' || savedOnly;
  const clear = () => {
    setQ('');
    setTopic('all');
    setCollection('all');
    setAgeBand('all');
    setSavedOnly(false);
  };

  if (library.state === 'loading') {
    return (
      <Page eyebrow={t('hadith.eyebrow')} title={t('hadith.title')} sub={t('hadith.sub')} wide>
        <StarLoader label={t('state.loading')} />
      </Page>
    );
  }

  return (
    <Page eyebrow={t('hadith.eyebrow')} title={t('hadith.title')} sub={t('hadith.sub')} wide>
      <div className="stack hadith-page" style={{ '--stack-gap': '28px' } as React.CSSProperties}>
        <section className="hadith-hero" aria-labelledby="hadith-hero-title">
          <div className="hadith-hero__copy">
            <span className="t-caption eyebrow">{t('hadith.hero.eyebrow')}</span>
            <h2 id="hadith-hero-title" className="t-h2">
              {t('hadith.hero.title')}
            </h2>
            <p className="muted">{t('hadith.hero.body')}</p>
            <div className="row wrap" style={{ gap: 10 }}>
              <Button icon="learn" onClick={() => document.getElementById('hadith-library')?.scrollIntoView({ block: 'start' })}>
                {t('hadith.hero.cta')}
              </Button>
              <Button variant="secondary" icon="compass" onClick={() => navigate(hadithDiscoverPath)}>
                {t('hadith.hero.discover')}
              </Button>
            </div>
            <div className="hadith-hero__meta">
              <span>
                <strong>{t('hadith.count', { n: HADITHS.length })}</strong>
              </span>
              <span>{t('hadith.activitiesCount', { n: HADITH_ACTIVITIES.length })}</span>
              {saved.length > 0 && <span>{t('hadith.savedCount', { n: saved.length })}</span>}
            </div>
          </div>
          <div className="hadith-hero__quote">
            <div className="hadith-hero__arch">
              <Icon name="quote" size={18} />
              <p dir="rtl" lang="ar">
                {featured.record.arabic}
              </p>
            </div>
            <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between' }}>
              <span className="t-small gold">{featured.record.source.reference}</span>
              <HadithStatusBadge provenance={featured.provenance} compact />
            </div>
            <div className="row wrap" style={{ gap: 12, justifyContent: 'space-between' }}>
              <a className="hadith-source-link" href={featured.record.source.url} target="_blank" rel="noopener noreferrer">
                <Icon name="globe" size={15} />
                {t('hadith.hero.source')}
              </a>
              <button type="button" className="hadith-text-link" onClick={() => navigate(hadithPath(featured.record.id))}>
                {t('hadith.open')} <Icon name="forward" size={15} className="flip-rtl" />
              </button>
            </div>
          </div>
        </section>

        <div className="hadith-toolbar">
          <div className="learn-search hadith-search">
            <Icon name="search" size={18} />
            <label htmlFor="hadith-q" className="sr-only">
              {t('hadith.searchLabel')}
            </label>
            <TextInput id="hadith-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hadith.search')} />
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <Chip tone={savedOnly ? 'gold' : 'quiet'} pressed={savedOnly} icon={savedOnly ? 'check' : 'plus'} onClick={() => setSavedOnly((v) => !v)}>
              {t('hadith.savedOnly')} {saved.length > 0 && `· ${saved.length}`}
            </Chip>
            {anyFilter && (
              <Button size="sm" variant="ghost" icon="close" onClick={clear}>
                {t('hadith.clear')}
              </Button>
            )}
          </div>
        </div>

        <div className="hadith-filters" aria-label={t('hadith.filters')}>
          <FilterRow label={t('hadith.topic')}>
            <Chip pressed={topic === 'all'} tone={topic === 'all' ? 'gold' : 'quiet'} onClick={() => setTopic('all')}>
              {t('hadith.all')}
            </Chip>
            {topics.map((tp) => (
              <Chip key={tp} pressed={topic === tp} tone={topic === tp ? 'gold' : 'quiet'} onClick={() => setTopic(tp)}>
                {t(`prof.topic.${tp}`)}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label={t('hadith.collection')}>
            <Chip pressed={collection === 'all'} tone={collection === 'all' ? 'gold' : 'quiet'} onClick={() => setCollection('all')}>
              {t('hadith.all')}
            </Chip>
            {COLLECTIONS.map((c) => (
              <Chip key={c} pressed={collection === c} tone={collection === c ? 'gold' : 'quiet'} onClick={() => setCollection(c)}>
                {t(`hadith.collection.${c}`)}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label={t('hadith.age')}>
            <Chip pressed={ageBand === 'all'} tone={ageBand === 'all' ? 'gold' : 'quiet'} onClick={() => setAgeBand('all')}>
              {t('hadith.all')}
            </Chip>
            {AGE_BANDS.map((b) => (
              <Chip key={b} pressed={ageBand === b} tone={ageBand === b ? 'gold' : 'quiet'} onClick={() => setAgeBand(b)}>
                {t(`hadith.ageBand.${b}`)}
              </Chip>
            ))}
          </FilterRow>
        </div>

        <Section title={t('hadith.count', { n: filtered.length })} id="hadith-library">
          {filtered.length === 0 ? (
            <EmptyState icon="search" title={t('hadith.noResults')} body={t('hadith.noResultsBody')} action={<Button variant="secondary" icon="refresh" onClick={clear}>{t('hadith.clear')}</Button>} />
          ) : (
            <div className="hadith-grid">
              <AnimatePresence initial={false}>
                {filtered.map((item) => (
                  <motion.article key={item.record.id} layout className="card hadith-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
                    <div className="hadith-card__head">
                      <CollectionChip record={item.record} />
                      <span className="spacer" />
                      <HadithStatusBadge provenance={item.provenance} compact />
                      <SaveHadithButton record={item.record} compact />
                    </div>
                    <button type="button" className="hadith-card__open" onClick={() => navigate(hadithPath(item.record.id))} aria-label={t('hadith.openLabel', { title: l(item.record.title) })}>
                      <span className="hadith-card__matn-label">{t('hadith.card.matn')}</span>
                      <span className="hadith-card__arabic" dir="rtl" lang="ar">
                        {item.record.arabic}
                      </span>
                      <span className="hadith-card__title">{l(item.record.title)}</span>
                      <span className="hadith-card__narrator">
                        {t('hadith.detail.narrator')} · {l(item.record.narrator)}
                      </span>
                      <span className="hadith-card__meaning">
                        <span className="t-caption gold">{t('hadith.card.meaning')}</span>
                        {l(item.record.meaning)}
                      </span>
                      <Topics record={item.record} />
                    </button>
                    <div className="hadith-card__foot">
                      <span className="t-caption muted" dir="ltr">
                        {item.record.source.reference}
                      </span>
                      <a className="hadith-source-link" href={item.record.source.url} target="_blank" rel="noopener noreferrer">
                        <Icon name="globe" size={14} />
                        {t('hadith.detail.source')}
                      </a>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Section>

        <DemoNote>{library.data.source === 'server' ? t('hadith.serverNote') : t('hadith.bundledNote')}</DemoNote>
      </div>
    </Page>
  );
}
