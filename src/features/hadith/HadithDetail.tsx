import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHadithLibrary, hadithDiscoverPath, hadithPath } from '@/api/hadith';
import { KNOWLEDGE_BY_ID } from '@/content/knowledge';
import type { HadithItem } from '@/api/hadith';
import { Button, EmptyState, Section, StarLoader } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useHadith } from '@/store/hadith';
import { useTutor } from '@/store/tutor';
import { CollectionChip, HadithProvenancePanel, HadithStatusBadge, SaveHadithButton, Topics } from './shared';
import './hadith.css';

export default function HadithDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const library = useHadithLibrary();
  const markExplored = useHadith((s) => s.markExplored);
  const showEvidence = useTutor((s) => s.showEvidence);
  const item = library.state === 'ready' ? library.data.items.find((x) => x.record.id === id) : undefined;

  useEffect(() => {
    if (item) markExplored(item.record.id);
  }, [item, markExplored]);

  if (library.state === 'loading') {
    return (
      <Page eyebrow={t('hadith.eyebrow')} title={t('hadith.detail.matn')}>
        <StarLoader label={t('state.loading')} />
      </Page>
    );
  }

  if (!item) {
    return (
      <Page eyebrow={t('hadith.eyebrow')} title={t('hadith.detail.notFound')}>
        <EmptyState
          icon="compass"
          title={t('hadith.detail.notFound')}
          body={t('hadith.detail.notFoundBody')}
          action={
            <Button variant="secondary" icon="back" onClick={() => navigate('/hadith')}>
              {t('hadith.detail.return')}
            </Button>
          }
        />
      </Page>
    );
  }

  const record = item.record;
  const relatedHadith = record.relatedHadith.map((rid) => library.data.items.find((x) => x.record.id === rid)).filter((x): x is HadithItem => !!x);
  const relatedKnowledge = record.relatedKnowledge.map((kid) => KNOWLEDGE_BY_ID[kid]).filter(Boolean);

  return (
    <Page
      eyebrow={
        <button type="button" className="hadith-text-link" onClick={() => navigate('/hadith')}>
          <Icon name="back" size={15} className="flip-rtl" />
          {t('hadith.detail.back')}
        </button>
      }
      title={l(record.title)}
      sub={`${l(record.narrator)} · ${record.source.reference}`}
      actions={
        <div className="row wrap" style={{ gap: 8 }}>
          <HadithStatusBadge provenance={item.provenance} compact />
          <SaveHadithButton record={record} />
        </div>
      }
      wide
    >
      <div className="stack hadith-detail" style={{ '--stack-gap': '26px' } as React.CSSProperties}>
        <div className="row wrap hadith-detail__meta">
          <CollectionChip record={record} />
          <Topics record={record} />
          <span className="spacer" />
          <a className="hadith-source-link" href={record.source.url} target="_blank" rel="noopener noreferrer">
            <Icon name="globe" size={15} />
            {t('hadith.detail.checkSource')}
          </a>
        </div>

        <div className="hadith-detail__grid">
          <section className="hadith-matn" aria-labelledby="hadith-matn-title">
            <span className="t-caption gold" id="hadith-matn-title">
              {t('hadith.detail.matn')}
            </span>
            <p dir="rtl" lang="ar" className="hadith-matn__text">
              {record.arabic}
            </p>
            <p className="t-caption muted hadith-matn__note">{t('hadith.detail.matnNote')}</p>
            <div className="hadith-matn__foot">
              <span dir="ltr">{record.source.inBookReference}</span>
              <a href={record.source.url} target="_blank" rel="noopener noreferrer" className="hadith-source-link">
                {record.source.reference}
                <Icon name="forward" size={13} className="flip-rtl" />
              </a>
            </div>
          </section>

          <section className="hadith-meaning" aria-labelledby="hadith-meaning-title">
            <span className="t-caption gold" id="hadith-meaning-title">
              {t('hadith.detail.meaning')}
            </span>
            <p>{l(record.meaning)}</p>
            <p className="t-caption muted">{record.englishMeaning.note ? l(record.englishMeaning.note) : t('hadith.detail.meaningNote')}</p>
            <span className="chip chip--demo">{t('hadith.card.meaning')}</span>
          </section>
        </div>

        <div className="hadith-sections">
          <section className="card hadith-section">
            <h2 className="t-h3">{t('hadith.detail.explanation')}</h2>
            <p>{l(record.explanation)}</p>
          </section>
          <section className="card hadith-section">
            <h2 className="t-h3">{t('hadith.detail.context')}</h2>
            <p>{l(record.context)}</p>
          </section>
          <section className="card hadith-section">
            <h2 className="t-h3">{t('hadith.detail.why')}</h2>
            <p>{l(record.why)}</p>
          </section>
        </div>

        <Section title={t('hadith.detail.vocabulary')} id="hadith-vocab">
          <ul className="hadith-vocab">
            {record.vocabulary.map((word) => (
              <li key={word.arabic} className="card card--flat hadith-vocab__item">
                <span className="hadith-vocab__ar" dir="rtl" lang="ar">
                  {word.arabic}
                </span>
                <span className="hadith-vocab__tr">{word.transliteration}</span>
                <span className="t-small muted">{l(word.meaning)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="hadith-detail__two">
          <Section title={t('hadith.detail.relatedKnowledge')} id="hadith-related-knowledge">
            <div className="stack" style={{ '--stack-gap': '8px' } as React.CSSProperties}>
              {relatedKnowledge.map((k) => (
                <button key={k.id} type="button" className="card card--interactive hadith-related" onClick={() => showEvidence(k.id)}>
                  <Icon name="layers" size={18} />
                  <span>{l(k.question)}</span>
                  <Icon name="forward" size={16} className="flip-rtl muted" />
                </button>
              ))}
            </div>
          </Section>
          <Section title={t('hadith.detail.relatedHadith')} id="hadith-related-hadith">
            <div className="stack" style={{ '--stack-gap': '8px' } as React.CSSProperties}>
              {relatedHadith.map((r) => (
                <button key={r.record.id} type="button" className="card card--interactive hadith-related" onClick={() => navigate(hadithPath(r.record.id))}>
                  <Icon name="quote" size={18} />
                  <span>
                    <strong>{l(r.record.title)}</strong>
                    <span className="t-caption muted" style={{ display: 'block' }} dir="ltr">
                      {r.record.source.reference}
                    </span>
                  </span>
                  <Icon name="forward" size={16} className="flip-rtl muted" />
                </button>
              ))}
            </div>
          </Section>
        </div>

        <Section title={t('hadith.detail.grading')} id="hadith-grading">
          <div className="hadith-grading">
            <div className="card card--flat hadith-grading__card">
              <span className="t-caption muted">{t('hadith.detail.gradingLabel')}</span>
              <strong className="hadith-grading__label">{l(record.grading.label)}</strong>
              <span className="t-small">
                {t('hadith.detail.gradingAuthority')}: {record.grading.authority}
              </span>
              <p className="t-small muted">{l(record.grading.note)}</p>
              <a className="hadith-source-link" href={record.grading.sourceUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="globe" size={14} />
                {t('hadith.detail.checkSource')}
              </a>
            </div>
            <div className="card card--flat hadith-grading__card">
              <span className="t-caption muted">{t('hadith.detail.source')}</span>
              <strong dir="ltr">{record.source.reference}</strong>
              <span className="t-small">{record.source.arabicEdition}</span>
              <span className="t-small muted" dir="ltr">
                {record.source.inBookReference}
              </span>
              <p className="t-small muted">{t('hadith.detail.matnNote')}</p>
            </div>
          </div>
        </Section>

        <HadithProvenancePanel item={item}>
          <div className="row wrap" style={{ gap: 10 }}>
            <Button icon="compass" onClick={() => navigate(hadithDiscoverPath)}>
              {t('hadith.detail.discover')}
            </Button>
            <Button variant="secondary" icon="learn" onClick={() => navigate('/hadith')}>
              {t('hadith.detail.return')}
            </Button>
          </div>
        </HadithProvenancePanel>
      </div>
    </Page>
  );
}
