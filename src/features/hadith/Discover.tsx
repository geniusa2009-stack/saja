import { useNavigate } from 'react-router-dom';
import type { HadithActivity, HadithActivityKind } from '@/domain/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { hadithActivityPath, hadithPath, useHadithLibrary } from '@/api/hadith';
import { Button, Chip, DemoNote, Section, StarLoader } from '@/design-system';
import { Icon, type IconName } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useHadith } from '@/store/hadith';
import './hadith.css';

const KIND_ICON: Record<HadithActivityKind, IconName> = {
  scenario: 'compass',
  match: 'layers',
  story: 'quote',
  sort: 'target',
  reflection: 'moon',
  review: 'star',
};

function ActivityCard({ activity }: { activity: HadithActivity }) {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const completed = useHadith((s) => s.completed.includes(activity.id));
  const library = useHadithLibrary();
  const items = library.state === 'ready' ? library.data.items : [];
  return (
    <article className="card hadith-activity-card">
      <div className="hadith-activity-card__head">
        <span className="hadith-activity-card__icon" aria-hidden>
          <Icon name={KIND_ICON[activity.kind]} size={22} />
        </span>
        <div>
          <span className="t-caption gold">{t(`hadith.kind.${activity.kind}`)}</span>
          <h3 className="t-h3">{l(activity.title)}</h3>
        </div>
        <span className="spacer" />
        <Chip tone={completed ? 'emerald' : 'quiet'} icon={completed ? 'check' : undefined}>
          {completed ? t('hadith.discover.completed') : t('hadith.discover.minutes', { n: activity.minutes })}
        </Chip>
      </div>
      <p className="t-small muted">{l(activity.summary)}</p>
      <div className="hadith-activity-card__hadith">
        <span className="t-caption muted">{t('hadith.discover.hadithLinks')}</span>
        <div className="row wrap" style={{ '--row-gap': '6px', gap: 6 } as React.CSSProperties}>
          {activity.hadithIds.map((id) => {
            const item = items.find((x) => x.record.id === id);
            return item ? (
              <button key={id} type="button" className="chip chip--quiet hadith-mini-link" onClick={() => navigate(hadithPath(id))}>
                {l(item.record.title)}
                {item.provenance.status === 'published' && <Icon name="seal" size={12} />}
              </button>
            ) : null;
          })}
        </div>
      </div>
      <div className="row wrap" style={{ gap: 8, marginTop: 'auto' }}>
        <Button size="sm" icon={completed ? 'refresh' : 'play'} onClick={() => navigate(hadithActivityPath(activity.id))}>
          {completed ? t('hadith.discover.revisit') : t('hadith.discover.begin')}
        </Button>
        <span className="chip chip--demo">{t('hadith.activity.sourceActivity')}</span>
      </div>
    </article>
  );
}

export default function Discover() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const library = useHadithLibrary();
  const completed = useHadith((s) => s.completed);
  if (library.state === 'loading') {
    return (
      <Page eyebrow={t('hadith.discover.eyebrow')} title={t('hadith.discover.title')} sub={t('hadith.discover.sub')} wide>
        <StarLoader label={t('state.loading')} />
      </Page>
    );
  }
  return (
    <Page eyebrow={t('hadith.discover.eyebrow')} title={t('hadith.discover.title')} sub={t('hadith.discover.sub')} wide>
      <div className="stack" style={{ '--stack-gap': '24px' } as React.CSSProperties}>
        <div className="card card--flat hadith-discover-intro">
          <div className="row wrap" style={{ gap: 10 }}>
            <Chip tone="gold" icon="compass">
              {t('hadith.discover.parts', { n: HADITH_ACTIVITIES.length })}
            </Chip>
            <span className="chip chip--emerald" aria-label={t('hadith.discover.completed')}>
              <Icon name="check" size={14} /> {completed.filter((id) => HADITH_ACTIVITIES.some((a) => a.id === id)).length}
            </span>
            <span className="spacer" />
            <Button size="sm" variant="secondary" icon="back" onClick={() => navigate('/hadith')}>
              {t('hadith.detail.return')}
            </Button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {t('hadith.discover.intro')}
          </p>
          <p className="t-small muted" style={{ margin: 0 }}>
            {t('hadith.discover.noScore')}
          </p>
        </div>

        <Section title={t('hadith.discover.activities')} id="hadith-activities">
          <div className="hadith-activity-grid">
            {HADITH_ACTIVITIES.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </Section>

        <DemoNote>{library.data.source === 'server' ? t('hadith.serverNote') : t('hadith.bundledNote')}</DemoNote>
      </div>
    </Page>
  );
}
