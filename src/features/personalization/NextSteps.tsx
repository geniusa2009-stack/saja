import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TopicId } from '@/domain/types';
import { LOCATIONS } from '@/content/world';
import { MISSIONS } from '@/content/missions';
import { learningLinks } from '@/content/learningGraph';
import { pathFor, PATHS } from '@/domain/journeyEngine';
import { unlockedLocations } from '@/domain/world';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { useProgress } from '@/store/progress';
import { useLearningTrail } from '@/store/learningTrail';
import './nextSteps.css';

/** Same live recommendations across the world, stories, Quran and hadith screens. */
export function NextSteps({ focus, excludeHref, compact = false }: { focus?: TopicId; excludeHref?: string; compact?: boolean }) {
  const { l } = useI18n();
  const profile = useProfile((s) => s.profile);
  const results = useProgress((s) => s.results);
  const recentTopic = useLearningTrail((s) => s.lastTopic);
  const completed = useMemo(() => Object.keys(results), [results]);
  const unlocked = useMemo(() => unlockedLocations(LOCATIONS, { completed }, MISSIONS), [completed]);
  if (!profile) return null;
  const track = PATHS[pathFor(profile.purpose)];
  const resources = learningLinks(profile, { focus: focus ?? recentTopic ?? undefined, completed, unlocked, excludeHref, limit: compact ? 2 : 3 });
  if (!resources.length) return null;
  return (
    <section className={`saja-nextsteps ${compact ? 'saja-nextsteps--compact' : ''}`} aria-label={l({ ar: 'اقتراحات مرتبطة برحلتك', en: 'Recommendations for your journey' })}>
      <div className="saja-nextsteps__head">
        <div>
          <span className="saja-nextsteps__eyebrow">{l(track.title)} · SAJA</span>
          <h2>{l({ ar: 'اكتشف الخطوة اللي بعدها', en: 'Keep the learning connected' })}</h2>
          <p>{l({ ar: 'اقتراحات حسب اختيارك وما تعلّمته، وليست تقييمًا لمعتقداتك.', en: 'Suggestions based on your choices and learning, not a judgment of beliefs.' })}</p>
        </div>
        <Link className="saja-nextsteps__edit" to="/profile">{l({ ar: 'غيّر رحلتك', en: 'Change your path' })}</Link>
      </div>
      <div className="saja-nextsteps__list">
        {resources.map((r) => (
          <Link key={r.id} to={r.href} className="saja-nextsteps__card">
            <small>{l({ ar: { knowledge: 'اكتشف', story: 'حكاية', mission: 'مهمة', quran: 'قرآن', hadith: 'مصادر' }[r.kind], en: { knowledge: 'Explore', story: 'Story', mission: 'Mission', quran: 'Quran', hadith: 'Sources' }[r.kind] })}</small>
            <strong>{l(r.title)}</strong>
            <span>{l(r.description)}</span>
            <span className="saja-nextsteps__go" aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
