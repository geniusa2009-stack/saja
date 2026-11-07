import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { SIDE_STORIES, STORY_KEEPSAKES, STORY_REGIONS, type SideStory } from '@/content/sideStories';
import './stories.css';

const STORAGE_KEY = 'saja:fictional-stories:completed:v1';
const ALL_IDS = new Set(SIDE_STORIES.map((entry) => entry.id));

function readLocalProgress(): Set<string> {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string' && ALL_IDS.has(id)) : []);
  } catch {
    return new Set();
  }
}

export default function StoriesPage() {
  const { l } = useI18n();
  const { region: regionParam } = useParams<{ region?: string }>();
  const region = STORY_REGIONS.find((entry) => entry.id === regionParam) ?? null;
  const [completed, setCompleted] = useState<Set<string>>(readLocalProgress);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const stories = useMemo(() => region ? SIDE_STORIES.filter((entry) => entry.region === region.id) : SIDE_STORIES, [region]);
  const selected: SideStory | null = stories.find((entry) => entry.id === selectedId) ?? null;
  const selectedChoice = selected?.choices.find((choice) => choice.id === chosenId) ?? null;
  const completedHere = stories.filter((entry) => completed.has(entry.id)).length;
  const unlockedKeepsakes = STORY_KEEPSAKES.filter((entry) => entry.afterEpisodes.every((id) => completed.has(id)));

  const chooseStory = (id: string) => {
    setSelectedId(id);
    setChosenId(null);
  };

  const finish = () => {
    if (!selected || !selectedChoice) return;
    const next = new Set(completed);
    next.add(selected.id);
    setCompleted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // The stories remain playable when local storage is disabled.
    }
    setSelectedId(null);
    setChosenId(null);
  };

  return (
    <div className="saja-stories" dir={l({ ar: 'rtl', en: 'ltr' })}>
      <header className="saja-stories__hero">
        <div>
          <p className="saja-stories__eyebrow">{l({ ar: 'سَجَى · حكايات العالم', en: 'SAJA · World Tales' })}</p>
          <h1>{region ? l(region.name) : l({ ar: 'عالم مليء بالحكايات', en: 'A World of Stories' })}</h1>
          <p className="saja-stories__intro">{l({
            ar: 'تجوّل بين المواقف والاختيارات: لا توجد إجابة تحفظها، بل قصة تكتشف أثر قراراتك فيها.',
            en: 'Explore situations and choices: no answers to memorise, just stories whose consequences you discover.',
          })}</p>
          <div className="saja-stories__hero-actions">
            <Link className="saja-stories__back" to="/">{l({ ar: 'العودة إلى العالم', en: 'Back to the world' })}</Link>
            {region && <Link className="saja-stories__back" to="/stories" onClick={() => setSelectedId(null)}>{l({ ar: 'كل المناطق', en: 'All places' })}</Link>}
          </div>
        </div>
        <div className="saja-stories__numbers" aria-label={l({ ar: 'تقدم الحكايات', en: 'Story progress' })}>
          <div><strong>{completedHere}<span>/{stories.length}</span></strong><small>{l({ ar: 'حكايات أنهيتها', en: 'Tales explored' })}</small></div>
          <div><strong>{unlockedKeepsakes.length}<span>/{STORY_KEEPSAKES.length}</span></strong><small>{l({ ar: 'تذكارات اكتشفتها', en: 'Keepsakes found' })}</small></div>
        </div>
      </header>

      <p className="saja-stories__disclaimer">{l({
        ar: 'حكايات خيالية للتجربة والتفكير، وليست نصوصًا دينية أو فتاوى. تقدمها محفوظ على هذا المتصفح فقط، ولا تمنح نقاطًا في حسابك.',
        en: 'Original fictional scenarios for reflection, not religious texts or rulings. Progress is saved only in this browser and does not award account points.',
      })}</p>

      <nav className="saja-stories__regions" aria-label={l({ ar: 'مناطق الحكايات', en: 'Story regions' })}>
        <Link className={!region ? 'is-active' : ''} to="/stories" onClick={() => setSelectedId(null)} aria-current={!region ? 'page' : undefined}>{l({ ar: 'كل الحكايات', en: 'All tales' })}</Link>
        {STORY_REGIONS.map((entry) => (
          <Link key={entry.id} className={region?.id === entry.id ? 'is-active' : ''} to={`/stories/${entry.id}`} onClick={() => setSelectedId(null)} aria-current={region?.id === entry.id ? 'page' : undefined}>
            {l(entry.name)} <small>{SIDE_STORIES.filter((story) => story.region === entry.id && completed.has(story.id)).length}/12</small>
          </Link>
        ))}
      </nav>

      {selected ? (
        <section className="saja-stories__reader" aria-labelledby="saja-story-title">
          <button type="button" className="saja-stories__text-button" onClick={() => { setSelectedId(null); setChosenId(null); }}>
            {l({ ar: 'رجوع للحكايات', en: 'Back to tales' })}
          </button>
          <p className="saja-stories__eyebrow">{l(STORY_REGIONS.find((entry) => entry.id === selected.region)!.name)} · {l({ ar: 'الحكاية', en: 'Tale' })} {selected.order}</p>
          <h2 id="saja-story-title">{l(selected.title)}</h2>
          <p className="saja-stories__scene">{l(selected.scene)}</p>
          <h3>{l({ ar: 'ماذا ستفعل؟', en: 'What will you do?' })}</h3>
          <div className="saja-stories__choices" role="group" aria-label={l({ ar: 'الاختيارات', en: 'Choices' })}>
            {selected.choices.map((choice, i) => (
              <button key={choice.id} type="button" onClick={() => setChosenId(choice.id)} className={chosenId === choice.id ? 'is-selected' : ''} aria-pressed={chosenId === choice.id}>
                <span className="saja-stories__choice-index">{i + 1}</span><span>{l(choice.text)}</span>
              </button>
            ))}
          </div>
          {selectedChoice && (
            <div className="saja-stories__consequence" role="status" aria-live="polite">
              <h3>{l({ ar: 'نتيجة اختيارك', en: 'What happens next' })}</h3>
              <p>{l(selectedChoice.result)}</p>
              <p className="saja-stories__reflection"><strong>{l({ ar: 'فكّر:', en: 'Think:' })}</strong> {l(selected.reflection)}</p>
              <button className="saja-stories__finish" type="button" onClick={finish}>
                {l({ ar: 'احفظ اكتشاف الحكاية', en: 'Mark this tale explored' })}
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby="saja-stories-list-title" className="saja-stories__section">
            <div className="saja-stories__section-head">
              <h2 id="saja-stories-list-title">{region ? l({ ar: 'حكايات هذه المنطقة', en: 'Tales of this place' }) : l({ ar: '108 حكايات لاكتشافها', en: '108 tales to explore' })}</h2>
              <span>{completedHere}/{stories.length}</span>
            </div>
            <div className="saja-stories__grid">
              {stories.map((story) => (
                <button key={story.id} className="saja-stories__tile" type="button" onClick={() => chooseStory(story.id)}>
                  <span className="saja-stories__tile-top"><span>{l(STORY_REGIONS.find((entry) => entry.id === story.region)!.name)}</span><span>{completed.has(story.id) ? '✓' : String(story.order).padStart(2, '0')}</span></span>
                  <strong>{l(story.title)}</strong>
                  <span className="saja-stories__tile-story">{l(story.scene)}</span>
                  <span className="saja-stories__tile-footer">{l({ ar: 'اختبر القرار', en: 'Explore a choice' })} <span aria-hidden="true">✦</span></span>
                </button>
              ))}
            </div>
          </section>
          <section aria-labelledby="saja-keepsake-title" className="saja-stories__section">
            <div className="saja-stories__section-head"><h2 id="saja-keepsake-title">{l({ ar: 'متحف التذكارات', en: 'Keepsake Gallery' })}</h2><span>{unlockedKeepsakes.length}/{STORY_KEEPSAKES.length}</span></div>
            <p className="saja-stories__subtext">{l({ ar: 'كل حكايتين من المنطقة تفتحان تذكارًا خياليًا مرتبطًا بها.', en: 'Every two tales in one region reveal a fictional keepsake from that place.' })}</p>
            <div className="saja-stories__keepsakes">
              {STORY_KEEPSAKES.filter((item) => !region || item.region === region.id).map((item) => {
                const unlocked = item.afterEpisodes.every((id) => completed.has(id));
                return <div key={item.id} className={`saja-stories__keepsake ${unlocked ? 'is-unlocked' : ''}`} aria-label={unlocked ? l(item.title) : l({ ar: 'تذكار لم يُكتشف بعد', en: 'Undiscovered keepsake' })}>
                  <span aria-hidden="true">{unlocked ? '✦' : '◇'}</span>
                  <strong>{unlocked ? l(item.title) : l({ ar: 'لم يُكتشف بعد', en: 'Not yet discovered' })}</strong>
                  <small>{unlocked ? l(item.description) : l({ ar: 'أكمل حكايتين لفتحه', en: 'Explore two tales to reveal' })}</small>
                </div>;
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
