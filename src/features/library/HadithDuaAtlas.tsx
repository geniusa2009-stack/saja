import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { copyText, normalizeArabic, safeReadStrings, saveJSON, validDuaPack, validHadithPack, type DuaPack, type HadithPack, type HadithItem } from './quality';
import './library.css';

const HADITH_SAVED = 'saja-hadith-saved-v1';
const DUA_SAVED = 'saja-dua-saved-v2';
const PER_PAGE = 12;
export default function HadithDuaAtlas() {
  const { isRTL } = useI18n();
  const [tab, setTab] = useState<'hadith' | 'duas'>('hadith');
  const [hadiths, setHadiths] = useState<HadithPack | null>(null);
  const [duas, setDuas] = useState<DuaPack | null>(null);
  const [hadithError, setHadithError] = useState(false);
  const [duaError, setDuaError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [grade, setGrade] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [savedHadith, setSavedHadith] = useState<string[]>(() => safeReadStrings(HADITH_SAVED));
  const [savedDua, setSavedDua] = useState<string[]>(() => safeReadStrings(DUA_SAVED));
  const [copied, setCopied] = useState<string | null>(null);
  const label = (ar: string, en: string) => isRTL ? ar : en;
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/saja-sources/hadith/hadith_ar.json', { signal: controller.signal })
      .then(async r => { if (!r.ok) throw Error('hadith missing'); const v: unknown = await r.json(); if (!validHadithPack(v)) throw Error('hadith validation failed'); return v; })
      .then(setHadiths).catch(() => { if (!controller.signal.aborted) setHadithError(true); });
    void fetch('/saja-sources/duas/quranic_duas.json', { signal: controller.signal })
      .then(async r => { if (!r.ok) throw Error('dua missing'); const v: unknown = await r.json(); if (!validDuaPack(v)) throw Error('dua validation failed'); return v; })
      .then(setDuas).catch(() => { if (!controller.signal.aborted) setDuaError(true); });
    return () => controller.abort();
  }, []);
  const categories = useMemo(() => [...new Set(hadiths?.items.map(h => h.category) || [])], [hadiths]);
  const grades = useMemo(() => [...new Set(hadiths?.items.map(h => h.grade) || [])], [hadiths]);
  const visibleHadith = useMemo(() => {
    const q = normalizeArabic(query);
    return (hadiths?.items || []).filter(h => (category === 'all' || h.category === category) && (grade === 'all' || h.grade === grade) && (!savedOnly || savedHadith.includes(h.id)) && (!q || normalizeArabic(`${h.title} ${h.hadeeth} ${h.explanation} ${h.reference} ${h.attribution} ${h.id}`).includes(q)));
  }, [hadiths, query, category, grade, savedOnly, savedHadith]);
  const visibleDuas = useMemo(() => {
    const q = normalizeArabic(query);
    return (duas?.items || []).filter(d => (!savedOnly || savedDua.includes(`${d.surah}:${d.ayah}`)) && (!q || normalizeArabic(d.arabic).includes(q) || `${d.surah}:${d.ayah}` === query.trim()));
  }, [duas, query, savedOnly, savedDua]);
  const total = tab === 'hadith' ? visibleHadith.length : visibleDuas.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, pages - 1);
  const resetFilter = () => { setQuery(''); setCategory('all'); setGrade('all'); setSavedOnly(false); setPage(0); };
  const toggleHadith = (id: string) => setSavedHadith(prev => { const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]; saveJSON(HADITH_SAVED, next); return next; });
  const toggleDua = (id: string) => setSavedDua(prev => { const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]; saveJSON(DUA_SAVED, next); return next; });
  const copy = async (id: string, content: string) => { setCopied(await copyText(content) ? id : 'unavailable'); };
  const selectedHadith = visibleHadith.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);
  const selectedDuas = visibleDuas.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);
  const citeHadith = (h: HadithItem) => `${h.hadeeth}\n\n${h.attribution}\n${h.grade}\n${h.reference}\nالمصدر: https://hadeethenc.com/ar/browse/hadith/${h.id}`;
  return <div className="saja-library saja-premium" dir={isRTL ? 'rtl' : 'ltr'}>
    <header className="saja-library__hero"><span className="saja-library__kicker">SAJA · THE LIBRARY OF LIGHT</span>
      <h1>{label('مكتبة الأحاديث والأدعية', 'Hadith & Quranic Supplications')}</h1>
      <p>{label('ابحث، تأمّل، واحفظ ما تريد الرجوع إليه. نعرض المتون والدرجات والمراجع كما وردت في المصدر، ولا نصنّف الأحاديث من عندنا.', 'Read, explore, and save. Narrations, grades, and references come from the credited publisher; SAJA does not assign independent grades.')}</p>
      <div className="saja-library__nav"><Link to="/mushaf">{label('المصحف الكريم', 'Complete Quran')}</Link><Link to="/quran/1">{label('استوديو الفاتحة', 'Al-Fatihah Studio')}</Link></div>
    </header>
    <div className="saja-library__metrics"><div><strong>{hadiths?.items.length.toLocaleString() || '—'}</strong><span>{label('حديث من المصدر', 'Attributed hadith')}</span></div><div><strong>{duas?.items.length || '—'}</strong><span>{label('آية تضم دعاءً', 'Quranic supplications')}</span></div><div><strong>{savedHadith.length + savedDua.length}</strong><span>{label('عنصر حفظته على جهازك', 'Saved on this device')}</span></div></div>
    <div className="saja-library__tabs" role="group" aria-label={label('نوع المحتوى', 'Library section')}><button type="button" aria-pressed={tab === 'hadith'} onClick={() => { setTab('hadith'); resetFilter(); }}>{label('الأحاديث النبوية', 'Hadith')} {hadiths ? `· ${hadiths.items.length}` : ''}</button><button type="button" aria-pressed={tab === 'duas'} onClick={() => { setTab('duas'); resetFilter(); }}>{label('الأدعية القرآنية', 'Quranic Duas')} {duas ? `· ${duas.items.length}` : ''}</button></div>
    {tab === 'hadith' && hadithError && <div className="saja-library__error" role="alert">{label('ملف الأحاديث المحلي غير موجود أو لم يجتز التحقق من البيانات. شغّل مستورد المصادر، ثم أعد تحميل الصفحة.', 'Hadith data was not found or failed validation. Run the official source importer and reload.')} <a href="https://hadeethenc.com/ar" target="_blank" rel="noreferrer">HadeethEnc</a></div>}
    {tab === 'duas' && duaError && <div className="saja-library__error" role="alert">{label('الأدعية القرآنية غير متاحة. استورد القرآن أولًا.', 'Quranic supplications are unavailable. Import Quran source files first.')}</div>}
    {((tab === 'hadith' && !hadiths && !hadithError) || (tab === 'duas' && !duas && !duaError)) && <p role="status" className="saja-library__loading">{label('جارٍ تحميل المكتبة والتحقق من المراجع…', 'Loading and validating library…')}</p>}
    {((tab === 'hadith' && hadiths) || (tab === 'duas' && duas)) && <>
      <p className="saja-library__source">{tab === 'hadith' ? label('المصدر: موسوعة الأحاديث النبوية HadeethEnc. النص والشرح والدرجة مُستوردون دون تعديل. هذه الحزمة للتطوير المحلي؛ يلزم التحقق من إصدار الناشر وحقوق النشر قبل الإتاحة العامة.', 'Source: HadeethEnc. Original text, explanation and grade are unmodified. Local development content; public release requires publisher-version and licensing review.') : label('النص القرآني من Tanzil. كل نتيجة تعرض الآية كاملة حتى لا يقتطع الدعاء من سياقه.', 'Quranic verses from Tanzil. The full verse is shown in its original context.')} <a href={tab === 'hadith' ? 'https://hadeethenc.com/ar' : 'https://tanzil.net'} target="_blank" rel="noreferrer">{tab === 'hadith' ? 'HadeethEnc.com' : 'Tanzil.net'}</a></p>
      <div className="saja-library__reading-tools"><label className="saja-library__field">{label('ابحث في المحتوى', 'Search content')}<input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder={tab === 'hadith' ? label('مثل: الصدق، الصلاة، أو رقم الحديث', 'Topic, words or hadith ID') : label('كلمة في الآية أو مرجع 2:201', 'Arabic word or 2:201')} /></label>
        {tab === 'hadith' && <><label className="saja-library__field">{label('التصنيف', 'Category')}<select value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}><option value="all">{label('جميع التصنيفات', 'All categories')}</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="saja-library__field">{label('الدرجة كما وردت في المصدر', 'Publisher grade')}<select value={grade} onChange={e => { setGrade(e.target.value); setPage(0); }}><option value="all">{label('جميع الدرجات المستوردة', 'All imported grades')}</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></label></>}
        <label className="saja-library__switch"><input type="checkbox" checked={savedOnly} onChange={e => { setSavedOnly(e.target.checked); setPage(0); }} /> {label('المحفوظة فقط', 'Saved only')}</label><button className="saja-library__reset" type="button" onClick={resetFilter}>{label('مسح الفلاتر', 'Clear filters')}</button></div>
      <p className="saja-library__count" role="status">{total} {label('نتيجة', 'results')}</p>
      {total === 0 && <div className="saja-library__empty"><h2>{label('مفيش نتائج مطابقة', 'No matching entries')}</h2><p>{label('جرّب كلمة تانية أو امسح الفلاتر.', 'Try another word or clear your filters.')}</p><button type="button" onClick={resetFilter}>{label('عرض الكل', 'Show all')}</button></div>}
      {tab === 'hadith' ? selectedHadith.map(h => { const open = expanded.includes(h.id); const saved = savedHadith.includes(h.id); return <article className="saja-library__entry" key={h.id}>
        <div className="saja-library__ayah-header"><span>{h.category} · {h.grade}</span><div className="saja-library__ayah-actions"><button type="button" aria-pressed={saved} onClick={() => toggleHadith(h.id)}>{saved ? '★ ' : '☆ '}{label('حفظ', 'Save')}</button><button type="button" onClick={() => void copy(`h-${h.id}`, citeHadith(h))}>{copied === `h-${h.id}` ? label('نُسخ', 'Copied') : label('نسخ مع المصدر', 'Copy with source')}</button></div></div>
        {h.title && <h2>{h.title}</h2>}<p className="saja-library__hadith" lang="ar" dir="rtl">{h.hadeeth}</p><p className="saja-library__source" lang="ar" dir="rtl">{h.attribution}</p>
        <button type="button" className="saja-library__disclose" aria-expanded={open} aria-controls={`saja-hadith-${h.id}`} onClick={() => setExpanded(prev => prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id])}>{open ? label('إخفاء الشرح والتخريج', 'Hide explanation') : label('اقرأ الشرح والتخريج', 'Read explanation & references')}</button>
        {open && <div className="saja-library__details" id={`saja-hadith-${h.id}`}><h3>{label('شرح الحديث كما ورد من المصدر', 'Publisher explanation')}</h3><p lang="ar" dir="rtl">{h.explanation || label('لم يُقدم المصدر شرحًا لهذا الحديث.', 'No publisher explanation supplied.')}</p><h3>{label('التخريج والمراجع', 'Attribution & references')}</h3><p lang="ar" dir="rtl">{h.reference || '—'}</p><a href={`https://hadeethenc.com/ar/browse/hadith/${encodeURIComponent(h.id)}`} target="_blank" rel="noreferrer">{label('افتح الأصل على موسوعة الأحاديث النبوية', 'Open original at HadeethEnc')} · {h.id}</a></div>}
      </article>; }) : selectedDuas.map(d => { const key = `${d.surah}:${d.ayah}`; const saved = savedDua.includes(key); return <article className="saja-library__entry" key={key}><div className="saja-library__ayah-header"><strong>{label('آية تتضمن دعاءً', 'Verse containing supplication')} · {key}</strong><div className="saja-library__ayah-actions"><button type="button" aria-pressed={saved} onClick={() => toggleDua(key)}>{saved ? '★ ' : '☆ '}{label('حفظ', 'Save')}</button><button type="button" onClick={() => void copy(`d-${key}`, `${d.arabic} — القرآن الكريم ${key} · Tanzil`)}>{copied === `d-${key}` ? label('نُسخ', 'Copied') : label('نسخ', 'Copy')}</button></div></div><p className="saja-library__verse" lang="ar" dir="rtl">{d.arabic}</p><p className="saja-library__hint">{label('الآية كاملة كما وردت في المصدر؛ ليست صيغة دعاء منفصلة.', 'Full original verse, not an extracted or rewritten supplication.')}</p><Link className="saja-library__verse-link" to={`/mushaf/${d.surah}?ayah=${d.ayah}`}>{label('اقرأها في موضعها من المصحف', 'Open exact verse in Quran')}</Link></article>; })}
      {copied === 'unavailable' && <p role="status">{label('النسخ غير متاح في المتصفح الحالي.', 'Clipboard is unavailable in this browser.')}</p>}
      <div className="saja-library__pagination"><button type="button" disabled={currentPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>{label('السابق', 'Previous')}</button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(p => Math.min(pages - 1, p + 1))}>{label('التالي', 'Next')}</button></div>
      <p className="saja-library__hint">{label('المحتوى ليس ترتيبًا لأفضلية الأحاديث ولا بديلًا عن الاستفتاء. جميع بيانات الحفظ تُخزّن محليًا في متصفحك.', 'This is not a ranking of hadith importance or a source for personal rulings. Bookmarks stay in your browser.')}</p>
    </>}
  </div>;
}
