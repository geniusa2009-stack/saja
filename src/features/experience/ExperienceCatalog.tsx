import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '@/app/Page';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { EXPERIENCE_CATALOG, CATALOG_COUNTS } from './catalog';
import { CATEGORIES, catalogSearch, type ContentCategory, type ContentFormat } from './experienceModel';
import './experience.css';

const FORMATS: readonly ContentFormat[] = ['study', 'hadith', 'mission', 'activity', 'story', 'world', 'tool'];
const formatLabel: Record<ContentFormat, { ar: string; en: string }> = {
  study: { ar: 'قراءة ودراسة', en: 'Study' }, hadith: { ar: 'حديث', en: 'Hadith' },
  mission: { ar: 'مهمة', en: 'Mission' }, activity: { ar: 'نشاط', en: 'Activity' },
  story: { ar: 'حكاية خيالية', en: 'Fictional story' }, world: { ar: 'عالم تفاعلي', en: 'World' },
  tool: { ar: 'أداة', en: 'Tool' },
};

export default function ExperienceCatalog() {
  const profile = useProfile((s) => s.profile)!;
  const { l } = useI18n();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const rawCategory = params.get('category');
  const rawFormat = params.get('format');
  const category: ContentCategory | 'all' = CATEGORIES.some((c) => c.id === rawCategory) ? rawCategory as ContentCategory : 'all';
  const format: ContentFormat | 'all' = FORMATS.includes(rawFormat as ContentFormat) ? rawFormat as ContentFormat : 'all';
  const results = useMemo(() => catalogSearch(EXPERIENCE_CATALOG, profile, query, category, format), [profile, query, category, format]);
  const update = (key: 'category' | 'format', next: string) => {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete(key); else p.set(key, next);
    setParams(p);
    setLimit(24);
  };
  return <Page wide eyebrow="SAJA · CONTENT LIBRARY" title={l({ ar: 'دليل محتوى سجى', en: 'The SAJA content catalogue' })} sub={l({ ar: 'المحتوى كله في مكان واحد: القرآن، الحديث، المعرفة، المهام، الحكايات والأدوات. فلتر وابحث بالطريقة اللي تريحك.', en: 'Find Qur’an, hadith, learning, missions, stories and tools in one place. Search and filter freely.' })}>
    <div className="expc">
      <div className="expc-top"><Link to="/home" className="expc-back">{l({ ar: 'العودة لصفحتي', en: 'Back to my home' })}</Link><span>{l({ ar: `مصادر حقيقية متصلة بفهرس واحد · ${CATALOG_COUNTS.stories} حكاية`, en: `Existing content in one index · ${CATALOG_COUNTS.stories} stories` })}</span></div>
      <div className="expc-filters">
        <div className="exps-field"><label htmlFor="expc-search">{l({ ar: 'بحث عربي أو إنجليزي', en: 'Search Arabic or English' })}</label><input id="expc-search" type="search" value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setLimit(24); }} placeholder={l({ ar: 'ابحث عن القرآن، الصلاة، أو أي موضوع...', en: 'Search a subject, question or title...' })}/></div>
        <div className="exps-field"><label htmlFor="expc-category">{l({ ar: 'القسم', en: 'Subject' })}</label><select id="expc-category" value={category} onChange={(e: ChangeEvent<HTMLSelectElement>) => update('category', e.target.value)}><option value="all">{l({ ar: 'جميع الأقسام', en: 'All subjects' })}</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{l(c.label)}</option>)}</select></div>
        <div className="exps-field"><label htmlFor="expc-format">{l({ ar: 'نوع المحتوى', en: 'Format' })}</label><select id="expc-format" value={format} onChange={(e: ChangeEvent<HTMLSelectElement>) => update('format', e.target.value)}><option value="all">{l({ ar: 'كل الأنواع', en: 'All formats' })}</option>{FORMATS.map((f) => <option value={f} key={f}>{l(formatLabel[f])}</option>)}</select></div>
      </div>
      <div className="expc-count" aria-live="polite">{l({ ar: `${results.length} عنصر متاح`, en: `${results.length} available items` })}</div>
      <div className="exph-grid">
        {results.slice(0, limit).map((item) => <Link key={item.id} to={item.href} className="exph-card">
          <small>{l(CATEGORIES.find((c) => c.id === item.category)!.label)} · {l(formatLabel[item.format])}</small>
          <strong>{l(item.title)}</strong><span>{l(item.summary)}</span>
          {item.status === 'fiction' && <em>{l({ ar: 'تجربة خيالية · ليست نصًا دينيًا', en: 'Fictional learning · not a religious text' })}</em>}
          {item.status === 'demo' && <em>{l({ ar: 'محتوى تجريبي · حالة المراجعة تظهر في صفحته', en: 'Demo material · review status on the destination page' })}</em>}
        </Link>)}
      </div>
      {results.length === 0 && <p className="expc-empty">{l({ ar: 'مفيش نتائج مطابقة. جرّب كلمة أو قسم تاني.', en: 'No matches. Try another query or filter.' })}</p>}
      {results.length > limit && <button className="expc-more" type="button" onClick={() => setLimit((n) => n + 24)}>{l({ ar: 'عرض المزيد', en: 'Show more' })}</button>}
      <p className="exps-note">{l({ ar: 'الفهرس ينظم النسخ الحالية؛ لا يغيّر حالة المراجعة الشرعية أو صلاحيات الوصول. محتوى الخادم المنشور يُتحقق منه في صفحته الأصلية.', en: 'This catalogue indexes bundled content; it does not grant scholarly approval or change access controls. Check the original page for server-published status.' })}</p>
    </div>
  </Page>;
}
