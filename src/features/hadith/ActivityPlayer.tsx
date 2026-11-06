import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { HadithActivity, MatchActivity, ReflectionActivity, ReviewActivity, ScenarioActivity, SortActivity, SortCategory, StoryActivity } from '@/domain/hadith';
import { HADITH_ACTIVITY_BY_ID } from '@/content/hadithActivities';
import { hadithDiscoverPath, hadithPath, useHadithLibrary } from '@/api/hadith';
import { Button, Chip, EmptyState, Field, TextArea } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n, type TKey } from '@/i18n';
import { Page } from '@/app/Page';
import { useHadith } from '@/store/hadith';
import './hadith.css';

function ChoiceFeedback({ text, gentle }: { text: string; gentle: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`hadith-feedback ${gentle ? 'hadith-feedback--gentle' : ''}`} role="status" aria-live="polite">
      <span className="t-caption gold">{gentle ? t('hadith.activity.feedback') : t('hadith.activity.pause')}</span>
      <p>{text}</p>
    </div>
  );
}

function ScenarioPlay({ activity, onDone }: { activity: ScenarioActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const [step, setStep] = useState(0);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const current = activity.steps[step];
  const selected = current.choices.find((c) => c.id === choiceId);
  const last = step === activity.steps.length - 1;
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
        <Chip tone="gold">{t('hadith.activity.step', { n: step + 1, total: activity.steps.length })}</Chip>
        <span className="t-caption muted">{l(activity.scenario)}</span>
      </div>
      <div className="hadith-scenario-prompt">
        <Icon name="compass" size={22} />
        <p>{l(current.prompt)}</p>
      </div>
      <div className="hadith-choices" role="group" aria-label={t('hadith.activity.choose')}>
        {current.choices.map((c) => (
          <button key={c.id} type="button" className="hadith-choice" aria-pressed={choiceId === c.id} onClick={() => setChoiceId(c.id)}>
            <span className="hadith-choice__dot" data-tone={c.tone} aria-hidden />
            <span>{l(c.label)}</span>
          </button>
        ))}
      </div>
      {selected && <ChoiceFeedback text={l(selected.feedback)} gentle={selected.tone === 'gentle'} />}
      <div className="row wrap" style={{ gap: 8 }}>
        <Button disabled={!selected} icon={last ? 'check' : undefined} iconEnd={last ? undefined : 'forward'} onClick={() => (last ? onDone() : (setStep((s) => s + 1), setChoiceId(null)))}>
          {last ? t('hadith.activity.finish') : t('hadith.activity.next')}
        </Button>
        {step > 0 && (
          <Button variant="ghost" icon="back" onClick={() => (setStep((s) => s - 1), setChoiceId(null))}>
            {t('hadith.activity.previous')}
          </Button>
        )}
      </div>
    </div>
  );
}

function MatchPlay({ activity, onDone }: { activity: MatchActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const meanings = useMemo(() => [...activity.pairs.slice(2), ...activity.pairs.slice(0, 2)], [activity]);
  const [word, setWord] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const complete = matched.length === activity.pairs.length;

  const check = (w: string, m: string) => {
    if (w === m) {
      setMatched((prev) => (prev.includes(w) ? prev : [...prev, w]));
      setWord(null);
      setMeaning(null);
      setWrong(false);
    } else {
      setWrong(true);
    }
  };
  const pickWord = (id: string) => {
    if (matched.includes(id)) return;
    setWord(id);
    setWrong(false);
    if (meaning) check(id, meaning);
  };
  const pickMeaning = (id: string) => {
    if (matched.includes(id)) return;
    setMeaning(id);
    setWrong(false);
    if (word) check(word, id);
  };
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div>
        <h3 className="t-h3">{t('hadith.activity.matchTitle')}</h3>
        <p className="muted">{t('hadith.activity.matchIntro')}</p>
      </div>
      <div className="hadith-match">
        <div className="hadith-match__col" role="group" aria-label={t('hadith.activity.words')}>
          <span className="t-caption muted">{t('hadith.activity.words')}</span>
          {activity.pairs.map((pair) => (
            <button
              key={pair.id}
              type="button"
              className="hadith-match__word"
              aria-pressed={word === pair.id}
              data-matched={matched.includes(pair.id) || undefined}
              disabled={matched.includes(pair.id)}
              onClick={() => pickWord(pair.id)}
            >
              <span dir="rtl" lang="ar">
                {pair.arabic}
              </span>
              <span className="t-caption muted" dir="ltr">
                {pair.transliteration}
              </span>
              {matched.includes(pair.id) && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
        <div className="hadith-match__col" role="group" aria-label={t('hadith.activity.meanings')}>
          <span className="t-caption muted">{t('hadith.activity.meanings')}</span>
          {meanings.map((pair) => (
            <button
              key={pair.id}
              type="button"
              className="hadith-match__meaning"
              aria-pressed={meaning === pair.id}
              data-matched={matched.includes(pair.id) || undefined}
              disabled={matched.includes(pair.id)}
              onClick={() => pickMeaning(pair.id)}
            >
              {l(pair.meaning)}
              {matched.includes(pair.id) && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      </div>
      <p className="t-small muted" role="status" aria-live="polite">
        {t('hadith.activity.matched', { n: matched.length, total: activity.pairs.length })}
      </p>
      {wrong && (
        <div className="hadith-feedback" role="alert">
          <p>{t('hadith.activity.matchWrong')}</p>
          <Button size="sm" variant="secondary" icon="refresh" onClick={() => (setWrong(false), setWord(null), setMeaning(null))}>
            {t('hadith.activity.tryAgain')}
          </Button>
        </div>
      )}
      {complete && (
        <div className="hadith-feedback hadith-feedback--gentle" role="status">
          <p>{t('hadith.activity.matchDone')}</p>
          <Button size="sm" icon="check" onClick={onDone}>
            {t('hadith.activity.finish')}
          </Button>
        </div>
      )}
    </div>
  );
}

function StoryPlay({ activity, onDone }: { activity: StoryActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const [page, setPage] = useState(0);
  const current = activity.pages[page];
  const last = page === activity.pages.length - 1;
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
        <Chip tone="gold">{t('hadith.activity.storyPage', { n: page + 1, total: activity.pages.length })}</Chip>
        <Chip tone="demo" icon="info">
          {t('hadith.activity.sourceActivity')}
        </Chip>
      </div>
      <div className="hadith-story">
        <span className="t-caption gold">{l(current.title)}</span>
        <p>{l(current.body)}</p>
      </div>
      <div className="hadith-feedback hadith-feedback--gentle">
        <span className="t-caption gold">{t('hadith.activity.label')}</span>
        <p>{l(activity.disclosure)}</p>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {page > 0 && (
          <Button variant="ghost" icon="back" onClick={() => setPage((p) => p - 1)}>
            {t('hadith.activity.previous')}
          </Button>
        )}
        <Button icon={last ? 'check' : undefined} iconEnd={last ? undefined : 'forward'} onClick={() => (last ? onDone() : setPage((p) => p + 1))}>
          {last ? t('hadith.activity.finish') : t('hadith.activity.next')}
        </Button>
      </div>
    </div>
  );
}

const SORT_CATEGORY: SortCategory[] = ['hadith', 'explanation', 'scenario'];
const sortLabelKey = (c: SortCategory): TKey => (c === 'hadith' ? 'hadith.activity.sortHadith' : c === 'explanation' ? 'hadith.activity.sortExplanation' : 'hadith.activity.sortScenario');

function SortPlay({ activity, onDone }: { activity: SortActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const [answers, setAnswers] = useState<Record<string, SortCategory>>({});
  const all = activity.items.every((item) => answers[item.id]);
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div>
        <h3 className="t-h3">{t('hadith.activity.sortTitle')}</h3>
        <p className="muted">{t('hadith.activity.sortIntro')}</p>
      </div>
      <div className="stack" style={{ '--stack-gap': '10px' } as React.CSSProperties}>
        {activity.items.map((item) => {
          const answer = answers[item.id];
          const correct = answer === item.correct;
          return (
            <div key={item.id} className="card card--flat hadith-sort-item">
              <p className="hadith-sort-item__text" dir="auto">
                {l(item.text)}
              </p>
              <div className="row wrap" style={{ gap: 6 }} role="group" aria-label={t('hadith.activity.sortTitle')}>
                {SORT_CATEGORY.map((cat) => (
                  <Chip key={cat} pressed={answer === cat} tone={answer === cat ? 'gold' : 'quiet'} onClick={() => setAnswers((a) => ({ ...a, [item.id]: cat }))}>
                    {t(sortLabelKey(cat))}
                  </Chip>
                ))}
              </div>
              {answer && (
                <p className={`t-small ${correct ? 'emerald' : 'muted'}`} role="status">
                  {t(correct ? 'hadith.activity.sortRight' : 'hadith.activity.sortWrong', { kind: t(sortLabelKey(item.correct)) })} {l(item.why)}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {all && (
        <div className="hadith-feedback hadith-feedback--gentle" role="status">
          <p>{t('hadith.activity.sortDone')}</p>
          <Button size="sm" icon="check" onClick={onDone}>
            {t('hadith.activity.finish')}
          </Button>
        </div>
      )}
    </div>
  );
}

function ReflectionPlay({ activity, onDone }: { activity: ReflectionActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const [lines, setLines] = useState(() => activity.prompts.map(() => ''));
  const addReflection = useHadith((s) => s.addReflection);
  const kept = useHadith((s) => s.reflections.some((r) => r.activityId === activity.id));
  const hasText = lines.some((line) => line.trim());
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div>
        <h3 className="t-h3">{t('hadith.activity.reflectionTitle')}</h3>
        <p className="muted">{t('hadith.activity.reflectionIntro')}</p>
        <p className="t-caption muted">{t('hadith.activity.reflectionPrivate')}</p>
      </div>
      {activity.prompts.map((prompt, i) => (
        <Field key={i} label={t('hadith.activity.reflectionPrompt', { n: i + 1 })} htmlFor={`reflection-${activity.id}-${i}`} hint={l(prompt)}>
          <TextArea
            id={`reflection-${activity.id}-${i}`}
            value={lines[i]}
            placeholder={t('hadith.activity.reflectionPlaceholder')}
            maxLength={2000}
            rows={3}
            onChange={(e) => setLines((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
          />
        </Field>
      ))}
      {kept && <Chip tone="emerald" icon="check">{t('hadith.activity.reflectionSaved')}</Chip>}
      <div>
        <Button
          icon="check"
          disabled={!hasText}
          onClick={() => {
            addReflection(activity.id, lines);
            onDone();
          }}
        >
          {t('hadith.activity.reflectionSave')}
        </Button>
      </div>
    </div>
  );
}

function ReviewPlay({ activity, onDone }: { activity: ReviewActivity; onDone: () => void }) {
  const { t, l } = useI18n();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = activity.cards[index];
  const last = index === activity.cards.length - 1;
  return (
    <div className="stack" style={{ '--stack-gap': '16px' } as React.CSSProperties}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
        <Chip tone="gold">{t('hadith.activity.card', { n: index + 1, total: activity.cards.length })}</Chip>
        <span className="t-caption muted">{card.reference}</span>
      </div>
      <button type="button" className={`hadith-flip ${flipped ? 'is-flipped' : ''}`} aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
        <span className="hadith-flip__inner">
          <span className="hadith-flip__face hadith-flip__front" aria-hidden={flipped}>
            <span className="t-caption gold">{t('hadith.activity.reviewPrompt')}</span>
            <span className="hadith-flip__text">{l(card.prompt)}</span>
          </span>
          <span className="hadith-flip__face hadith-flip__back" aria-hidden={!flipped}>
            <span className="t-caption gold">{t('hadith.activity.reviewAnswer')}</span>
            <span className="hadith-flip__text">{l(card.answer)}</span>
            <span className="t-caption muted" dir="ltr">
              {card.reference}
            </span>
          </span>
        </span>
      </button>
      <div className="row wrap" style={{ gap: 8 }}>
        <Button variant="secondary" icon={flipped ? 'eye' : 'layers'} onClick={() => setFlipped((f) => !f)}>
          {flipped ? t('hadith.activity.hide') : t('hadith.activity.reveal')}
        </Button>
        {index > 0 && (
          <Button variant="ghost" icon="back" onClick={() => (setIndex((i) => i - 1), setFlipped(false))}>
            {t('hadith.activity.previousCard')}
          </Button>
        )}
        {last ? (
          <Button icon="check" onClick={onDone}>
            {t('hadith.activity.finish')}
          </Button>
        ) : (
          <Button iconEnd="forward" onClick={() => (setIndex((i) => i + 1), setFlipped(false))}>
            {t('hadith.activity.nextCard')}
          </Button>
        )}
      </div>
      {last && <p className="t-small muted">{t('hadith.activity.reviewDone')}</p>}
    </div>
  );
}

function ActivityBody({ activity, onDone }: { activity: HadithActivity; onDone: () => void }) {
  switch (activity.kind) {
    case 'scenario':
      return <ScenarioPlay activity={activity} onDone={onDone} />;
    case 'match':
      return <MatchPlay activity={activity} onDone={onDone} />;
    case 'story':
      return <StoryPlay activity={activity} onDone={onDone} />;
    case 'sort':
      return <SortPlay activity={activity} onDone={onDone} />;
    case 'reflection':
      return <ReflectionPlay activity={activity} onDone={onDone} />;
    case 'review':
      return <ReviewPlay activity={activity} onDone={onDone} />;
  }
}

export default function ActivityPlayer() {
  const { activityId } = useParams<{ activityId: string }>();
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const library = useHadithLibrary();
  const [done, setDone] = useState(false);
  const complete = useHadith((s) => s.completeActivity);
  const activity = activityId ? HADITH_ACTIVITY_BY_ID[activityId] : undefined;
  const hadithItems = library.state === 'ready' && activity ? activity.hadithIds.map((id) => library.data.items.find((x) => x.record.id === id)).filter((x) => !!x) : [];

  if (!activity) {
    return (
      <Page eyebrow={t('hadith.discover.eyebrow')} title={t('hadith.detail.notFound')}>
        <EmptyState
          icon="compass"
          title={t('hadith.detail.notFound')}
          body={t('hadith.detail.notFoundBody')}
          action={<Button variant="secondary" icon="back" onClick={() => navigate(hadithDiscoverPath)}>{t('hadith.activity.backToDiscover')}</Button>}
        />
      </Page>
    );
  }

  if (library.state === 'loading') {
    return (
      <Page eyebrow={t('hadith.discover.eyebrow')} title={l(activity.title)}>
        <div className="state" role="status" aria-live="polite">
          <span className="t-small">{t('state.loading')}</span>
        </div>
      </Page>
    );
  }

  const finish = () => {
    complete(activity.id);
    setDone(true);
  };

  return (
    <Page
      eyebrow={
        <button type="button" className="hadith-text-link" onClick={() => navigate(hadithDiscoverPath)}>
          <Icon name="back" size={15} className="flip-rtl" />
          {t('hadith.activity.back')}
        </button>
      }
      title={l(activity.title)}
      sub={l(activity.summary)}
      wide
    >
      <div className="stack" style={{ '--stack-gap': '20px' } as React.CSSProperties}>
        <div className="row wrap" style={{ gap: 8 }}>
          <Chip tone="gold" icon="compass">
            {t(`hadith.kind.${activity.kind}`)}
          </Chip>
          <Chip tone="quiet">{t('hadith.discover.minutes', { n: activity.minutes })}</Chip>
          <span className="chip chip--demo">{t('hadith.activity.sourceActivity')}</span>
        </div>

        <div className="hadith-player-grid">
          <main className="card hadith-player-stage" aria-live="polite">
            {done ? (
              <div className="hadith-complete">
                <span className="hadith-complete__mark" aria-hidden>
                  <Icon name="star" size={28} />
                </span>
                <h2 className="t-h2">{t('hadith.activity.done')}</h2>
                <p className="muted">{t('hadith.activity.doneBody')}</p>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Button variant="secondary" icon="back" onClick={() => navigate(hadithDiscoverPath)}>
                    {t('hadith.activity.backToDiscover')}
                  </Button>
                  {hadithItems[0] && (
                    <Button icon="quote" onClick={() => navigate(hadithPath(hadithItems[0]!.record.id))}>
                      {t('hadith.activity.readHadith')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <ActivityBody activity={activity} onDone={finish} />
            )}
          </main>

          <aside className="stack hadith-player-aside" style={{ '--stack-gap': '14px' } as React.CSSProperties}>
            <div className="card card--flat hadith-player-aside__card">
              <span className="t-caption gold">{t('hadith.discover.hadithLinks')}</span>
              <div className="stack" style={{ '--stack-gap': '8px' } as React.CSSProperties}>
                {hadithItems.map((item) => (
                  <button key={item.record.id} type="button" className="hadith-related" onClick={() => navigate(hadithPath(item.record.id))}>
                    <Icon name="quote" size={17} />
                    <span>
                      <strong>{l(item.record.title)}</strong>
                      <span className="t-caption muted" style={{ display: 'block' }} dir="ltr">
                        {item.record.source.reference}
                      </span>
                    </span>
                    <Icon name="forward" size={15} className="flip-rtl muted" />
                  </button>
                ))}
              </div>
            </div>
            <div className="card card--flat hadith-player-aside__card">
              <span className="t-caption gold">{t('hadith.activity.label')}</span>
              <p className="t-small muted">{t('hadith.activity.hadithNotice')}</p>
              {activity.kind === 'scenario' || activity.kind === 'story' ? <p className="t-small muted">{l(activity.label)}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
