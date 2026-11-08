import { Link } from 'react-router-dom';
import { useJourney } from '@/app/hooks';
import { PATHS, pathFor } from '@/domain/journeyEngine';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import './nextSteps.css';

/** Actual next playable missions, never a fabricated/unlocked-only curriculum. */
export function PathRoadmap() {
  const { l } = useI18n();
  const profile = useProfile((s) => s.profile);
  const journey = useJourney();
  if (!profile) return null;
  const path = PATHS[pathFor(profile.purpose)];
  const missions = journey.recs.slice(0, 4);
  return (
    <section className="saja-roadmap" aria-label={l({ ar: 'خطة رحلتك التعليمية', en: 'Your personal learning path' })}>
      <header>
        <span>{l({ ar: 'خطوات مقترحة وليست إلزامية', en: 'Suggested steps, never required' })}</span>
        <h2>{l(path.title)}</h2>
        <p>{l(path.intro)}</p>
      </header>
      {missions.length ? <ol className="saja-roadmap__steps">
        {missions.map(({ mission }, i) => (
          <li key={mission.id} className="saja-roadmap__step">
            <span className="saja-roadmap__num" aria-hidden="true">{i + 1}</span>
            <div>
              <strong>{l(mission.title)}</strong>
              <small>{l(mission.summary)}</small>
            </div>
            <Link to={`/mission/${mission.id}`}>{l({ ar: i === 0 ? 'ابدأ' : 'استكشف', en: i === 0 ? 'Start' : 'Explore' })}</Link>
          </li>
        ))}
      </ol> : <p>{l({ ar: 'أنهيت المهمات المتاحة حاليًا. يمكنك استكشاف القرآن والحكايات والمصادر.', en: 'You completed the currently available missions. Explore the Quran, stories and sources next.' })}</p>}
    </section>
  );
}
