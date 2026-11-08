import type { ReactNode } from 'react';
import type { HadithItem } from '@/api/hadith';
import type { HadithRecord } from '@/domain/hadith';
import { Chip } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useHadith } from '@/store/hadith';

export function HadithStatusBadge({ provenance, compact }: { provenance: HadithItem['provenance']; compact?: boolean }) {
  const { t } = useI18n();
  return provenance.status === 'published' ? (
    <Chip tone="emerald" icon="seal">
      {t('hadith.status.published')}
    </Chip>
  ) : (
    <Chip tone="demo" icon="info">
      {compact ? t('state.demo') : t('hadith.status.demo')}
    </Chip>
  );
}

export function SaveHadithButton({ record, compact }: { record: HadithRecord; compact?: boolean }) {
  const { t, l } = useI18n();
  const saved = useHadith((s) => s.saved.includes(record.id));
  const toggle = useHadith((s) => s.toggleSaved);
  return (
    <button
      type="button"
      className={`hadith-save ${saved ? 'is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={t(saved ? 'hadith.unsaveLabel' : 'hadith.saveLabel', { title: l(record.title) })}
      onClick={() => toggle(record.id)}
    >
      <Icon name={saved ? 'check' : 'plus'} size={16} />
      {!compact && <span>{saved ? t('hadith.saved') : t('hadith.save')}</span>}
    </button>
  );
}

export function CollectionChip({ record }: { record: HadithRecord }) {
  const { t } = useI18n();
  return (
    <span className="hadith-ref" dir="ltr">
      <Icon name="learn" size={14} />
      {t(`hadith.collection.${record.collection}`)} · {record.source.number}
    </span>
  );
}

export function Topics({ record }: { record: HadithRecord }) {
  const { t } = useI18n();
  return (
    <div className="row wrap hadith-topics" aria-label={t('hadith.detail.topics')}>
      {record.topics.map((topic) => (
        <span key={topic} className="chip chip--quiet">
          {t(`prof.topic.${topic}`)}
        </span>
      ))}
      {record.ageBands.map((band) => (
        <span key={band} className="chip chip--quiet">
          {t(`hadith.ageBand.${band}`)}
        </span>
      ))}
    </div>
  );
}

const dateText = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(new Date(iso));

/** Honest provenance: a review badge appears only for a published snapshot sent by the server. */
export function HadithProvenancePanel({ item, children }: { item: HadithItem; children?: ReactNode }) {
  const { t, intl } = useI18n();
  const p = item.provenance;
  const approved = p.reviews.find((r) => r.toStatus === 'approved');
  const published = p.reviews.find((r) => r.toStatus === 'published');
  return (
    <section className="hadith-provenance" aria-label={t('hadith.status.trail')}>
      <div className="row wrap" style={{ gap: 8 }}>
        <HadithStatusBadge provenance={p} />
        {p.version != null && <span className="chip chip--quiet">{t('hadith.status.version', { v: p.version })}</span>}
        {p.source === 'bundled-demo' && <span className="chip chip--quiet">{t('state.offline')}</span>}
      </div>
      <p className="t-small muted">{p.status === 'published' ? t('hadith.status.publishedLong') : t('hadith.status.demoLong')}</p>
      {(approved || published) && (
        <div className="hadith-trail">
          <span className="t-caption gold">{t('hadith.status.trail')}</span>
          {approved && (
            <p className="t-small">
              {approved.scholar
                ? t('hadith.status.approvedBy', { name: approved.scholar.name, scope: approved.scope })
                : t('hadith.status.approvedBy', { name: t('cs.role.verified_scholar'), scope: approved.scope })}
            </p>
          )}
          {published && <p className="t-small muted">{t('hadith.status.publishedOn', { date: dateText(published.at, intl) })}</p>}
        </div>
      )}
      {p.status === 'demo' && <p className="t-small muted">{t('hadith.status.noTrail')}</p>}
      {children}
    </section>
  );
}
