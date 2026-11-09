import { Link } from 'react-router-dom';
import { Page } from '@/app/Page';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { HOME_CATALOG } from './catalogCore';
import { CATEGORIES, recommendations, effectivePurpose } from './experienceModel';
import { displayFor, useExperience } from './experienceStore';
import './experience.css';

const TITLES = {
  child: { ar: 'عالمك مليان اكتشافات', en: 'A world to discover' },
  exploring: { ar: 'اكتشف الإسلام بطريقتك', en: 'Explore Islam your way' },
  'new-muslim': { ar: 'خطوتك التالية، براحتك', en: 'Your next step, at your pace' },
  'learn-more': { ar: 'معرفة أعمق، على اختيارك', en: 'Deeper knowledge, your choice' },
} as const;

export default function ExperienceHome() {
  const profile = useProfile((s) => s.profile)!;
  const stored = useExperience((s) => s.byTraveller);
  const display = displayFor(profile, stored);
  const { l, locale } = useI18n();
  const track = effectivePurpose(profile);
  const picks = recommendations(HOME_CATALOG, profile, display, 6);
  const welcome = locale === 'ar' ? `أهلًا، ${profile.name}` : `Welcome, ${profile.name}`;
  return <Page wide eyebrow="SAJA · YOUR JOURNEY" title={welcome} sub={l({ ar: 'الصفحة دي مبنية على اختياراتك، مش على افتراضات عن معتقدك أو مستواك.', en: 'Built from your choices, not assumptions about your beliefs or knowledge.' })}>
    <div className="exph">
      <section className="exph-hero" aria-labelledby="exph-hero-heading">
        <div>
          <span className="exph-eyebrow">✦ SAJA</span>
          <h2 id="exph-hero-heading">{l(TITLES[track])}</h2>
          <p>{l({ ar: 'تابع موضوعًا يهمك، أو افتح المكتبة الكاملة. القصص والمغامرات اختيارية دائمًا.', en: 'Continue with something that interests you, or browse the full library. Stories and adventures are always optional.' })}</p>
          <div className="exph-actions">
            <Link to="/catalog" className="exph-primary">{l({ ar: 'تصفح كل المحتوى', en: 'Browse all content' })}</Link>
            <Link to="/profile" className="exph-secondary">{l({ ar: 'تخصيص تجربتي', en: 'Personalise my experience' })}</Link>
          </div>
        </div>
        <span className="exph-orbit" aria-hidden="true">✦</span>
      </section>

      <section aria-labelledby="exph-picks-heading">
        <div className="exph-heading"><h2 id="exph-picks-heading">{l({ ar: 'مقترح ليك', en: 'Chosen for your interests' })}</h2><span>{l({ ar: 'ابدأ من أي مكان', en: 'Start anywhere' })}</span></div>
        <div className="exph-grid">
          {picks.map((item) => <Link key={item.id} to={item.href} className="exph-card">
            <small>{l(CATEGORIES.find((cat) => cat.id === item.category)!.label)} · {item.format === 'story' ? l({ ar: 'قصة خيالية', en: 'Fictional story' }) : item.format === 'mission' ? l({ ar: 'تجربة', en: 'Activity' }) : l({ ar: 'قراءة ومعرفة', en: 'Study & learning' })}</small>
            <strong>{l(item.title)}</strong>
            <span>{l(item.summary)}</span>
            {item.status === 'demo' && <em>{l({ ar: 'محتوى تجريبي · راجع حالة التوثيق عند الفتح', en: 'Demo content · check review status on opening' })}</em>}
          </Link>)}
        </div>
      </section>

      <section aria-labelledby="exph-sections-heading">
        <div className="exph-heading"><h2 id="exph-sections-heading">{l({ ar: 'المحتوى حسب الموضوع', en: 'Explore by subject' })}</h2></div>
        <nav className="exph-categories" aria-label={l({ ar: 'أقسام المحتوى', en: 'Content categories' })}>
          {CATEGORIES.filter((category) => category.id !== 'world' || display.showWorld || display.showStories).map((cat) => <Link key={cat.id} to={`/catalog?category=${cat.id}`}>{l(cat.label)}<span aria-hidden>↗</span></Link>)}
        </nav>
      </section>

      {(display.showWorld || display.showStories) && <section className="exph-extra" aria-label={l({ ar: 'التجارب التفاعلية', en: 'Interactive experiences' })}>
        <div><h2>{l({ ar: 'اكتشف بالتجربة', en: 'Learn by experiencing' })}</h2><p>{l({ ar: 'عالم القرية والحكايات مش شرط لرحلتك؛ افتحهم وقت ما تحب.', en: 'World exploration and stories are optional — visit whenever you like.' })}</p></div>
        <div className="exph-actions">{display.showWorld && <Link className="exph-secondary" to="/">{l({ ar: 'دخول العالم', en: 'Enter the world' })}</Link>}{display.showStories && <Link className="exph-secondary" to="/stories">{l({ ar: 'الحكايات', en: 'Stories' })}</Link>}</div>
      </section>}
    </div>
  </Page>;
}
