import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { fetchVerified, getChapterName, QURAN_VERSE_COUNTS, validChapter, type QuranChapter, type QuranChapterName } from './catalogue';
import { copyText, findInQuran, makeMemorizationOptions, normalizeArabic, safeReadObject, safeReadStrings, saveJSON, validSearchPack, type QuranSearchPack } from './quality';
import './library.css';

const CDN = 'https://quran-json.risanb.com';
const MARKS = 'saja-mushaf-bookmarks-v1';
const LAST = 'saja-mushaf-lastread-v2';
const SIZE = 'saja-mushaf-fontsize-v2';
const PAGE_SIZE = 18;
type TranslationChapter = { id: number; verses: Array<{ id: number; translation: string }> };
const validNames = (x: unknown): x is QuranChapterName[] => Array.isArray(x) && x.length === 114 && x.every((v, i) => v && v.id === i + 1);
const validTranslation = (x: unknown, id: number): x is TranslationChapter => {
  if (!x || typeof x !== 'object') return false;
  const c = x as Partial<TranslationChapter>;
  return c.id === id && Array.isArray(c.verses) && c.verses.length === QURAN_VERSE_COUNTS[id - 1] && c.verses.every((v, i) => v.id === i + 1 && typeof v.translation === 'string');
};
const validSavedSize = (): number => {
  try { const n = Number(localStorage.getItem(SIZE)); return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 1; } catch { return 1; }
};

export default function QuranAtlas() {
  const { surahId } = useParams();
  const [params, setParams] = useSearchParams();
  const { isRTL } = useI18n();
  const n = Number(surahId);
  const chosen = surahId !== undefined && Number.isInteger(n) && n >= 1 && n <= 114;
  const invalid = surahId !== undefined && !chosen;
  const [names, setNames] = useState<QuranChapterName[]>([]);
  const [chapter, setChapter] = useState<QuranChapter | null>(null);
  const [translation, setTranslation] = useState<TranslationChapter | null>(null);
  const [error, setError] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [verseQuery, setVerseQuery] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchPack, setSearchPack] = useState<QuranSearchPack | null>(null);
  const [globalError, setGlobalError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [marks, setMarks] = useState<string[]>(() => safeReadStrings(MARKS));
  const [lastRead, setLastRead] = useState<Record<string, number>>(() => safeReadObject(LAST));
  const [size, setSize] = useState(validSavedSize);
  const [showEnglish, setShowEnglish] = useState(false);
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [quizAyah, setQuizAyah] = useState(1);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const requested = Number(params.get('ayah'));
  const requestedAyah = chosen && Number.isInteger(requested) && requested >= 1 && requested <= QURAN_VERSE_COUNTS[n - 1] ? requested : null;
  useEffect(() => {
    const controller = new AbortController();
    void fetchVerified('/saja-sources/quran/chapters.json', `${CDN}/chapters.json`, validNames, controller.signal)
      .then(setNames).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setChapter(null); setTranslation(null); setError(''); setVerseQuery(''); setPage(0); setHidden([]); setQuizPicked(null); setQuizAyah(1);
    if (!chosen) return;
    const controller = new AbortController();
    void fetchVerified(`/saja-sources/quran/${n}.json`, `${CDN}/text/uthmani/chapters/${n}.json`, (x): x is QuranChapter => validChapter(x, n), controller.signal)
      .then(setChapter).catch(() => { if (!controller.signal.aborted) setError(isRTL ? 'النص القرآني غير متاح أو فشل التحقق من سلامته. تأكد من الملفات المحلية.' : 'Quran data unavailable or failed structural validation. Check the local source files.'); });
    return () => controller.abort();
  }, [chosen, n, isRTL]);
  useEffect(() => {
    if (!chosen || !showEnglish) return;
    const controller = new AbortController();
    void fetchVerified(`/saja-sources/quran/en-yusuf-ali/${n}.json`, `${CDN}/translations/en-yusuf-ali/chapters/${n}.json`, (x): x is TranslationChapter => validTranslation(x, n), controller.signal)
      .then(setTranslation).catch(() => { if (!controller.signal.aborted) setTranslation(null); });
    return () => controller.abort();
  }, [chosen, n, showEnglish]);
  useEffect(() => { if (chapter && requestedAyah) { setPage(Math.floor((requestedAyah - 1) / PAGE_SIZE)); setVerseQuery(''); } }, [chapter, requestedAyah]);
  useEffect(() => {
    if (!chapter || !requestedAyah) return;
    const id = `saja-ayah-${n}-${requestedAyah}`;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'auto' }), 80);
    return () => clearTimeout(t);
  }, [chapter, n, requestedAyah, page]);
  useEffect(() => {
    if (chosen || normalizeArabic(globalQuery).length < 2 || searchPack || globalError) return;
    const controller = new AbortController(); setSearching(true);
    void fetch('/saja-sources/quran/search-index.json', { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(String(r.status)); const value: unknown = await r.json(); if (!validSearchPack(value)) throw new Error('Quran index mismatch'); return value; })
      .then(setSearchPack).catch(() => { if (!controller.signal.aborted) setGlobalError(true); })
      .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    return () => controller.abort();
  }, [chosen, globalQuery, searchPack, globalError]);
  const chapterName = getChapterName(names[n - 1], n, isRTL);
  const list = useMemo(() => (chapter?.verses || []).filter(v => {
    const query = normalizeArabic(verseQuery);
    return !query || normalizeArabic(v.text).includes(query) || String(v.id) === verseQuery.trim();
  }), [chapter, verseQuery]);
  const globalResults = useMemo(() => findInQuran(searchPack?.items || [], globalQuery), [searchPack, globalQuery]);
  const allNames = useMemo(() => Array.from({ length: 114 }, (_, i) => i + 1).filter(id => !nameQuery || String(id).includes(nameQuery) || normalizeArabic(getChapterName(names[id - 1], id, true)).includes(normalizeArabic(nameQuery)) || getChapterName(names[id - 1], id, false).toLowerCase().includes(nameQuery.toLowerCase())), [nameQuery, names]);
  const quiz = useMemo(() => makeMemorizationOptions(chapter?.verses || [], quizAyah), [chapter, quizAyah]);
  const maxPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const shownPage = Math.min(page, maxPages - 1);
  const toggleMark = (key: string) => setMarks(old => { const updated = old.includes(key) ? old.filter(x => x !== key) : [...old, key]; saveJSON(MARKS, updated); return updated; });
  const markReading = (ayah: number) => {
    setLastRead(prev => { const updated = { ...prev, [String(n)]: ayah }; saveJSON(LAST, updated); return updated; });
  };
  const jump = (ayah: number) => { setVerseQuery(''); setPage(Math.floor((ayah - 1) / PAGE_SIZE)); setParams({ ayah: String(ayah) }, { replace: true }); };
  const label = (ar: string, en: string) => isRTL ? ar : en;
  const onCopy = async (key: string, value: string) => { const done = await copyText(value); setCopied(done ? key : 'failed'); };
  return <div className="saja-library saja-premium" dir={isRTL ? 'rtl' : 'ltr'}>
    <header className="saja-library__hero"><span className="saja-library__kicker">SAJA · THE QURAN ATLAS</span>
      <h1>{chosen ? chapterName : label('القرآن الكريم', 'The Noble Quran')}</h1>
      <p>{label('مساحة هادئة للقراءة والتأمل ومراجعة الحفظ؛ النص كما ورد في المصدر، دون توليد آيات أو تفسيرات.', 'A calm place for reading and memorization practice. Scripture is displayed from attributed source data, never AI-generated.')}</p>
      <div className="saja-library__nav"><Link to="/mushaf">{label('السور', 'Chapters')}</Link><Link to="/quran/1">{label('استوديو الفاتحة', 'Al-Fatihah Studio')}</Link><Link to="/hadith-library">{label('الحديث والدعاء', 'Hadith & Duas')}</Link></div>
    </header>
    {invalid ? <div className="saja-library__error" role="alert">{label('رقم السورة غير صحيح.', 'Unknown chapter number.')} <Link to="/mushaf">{label('فهرس السور', 'Browse chapters')}</Link></div> : !chosen ? <>
      <div className="saja-library__metrics" aria-label={label('معلومات المصحف', 'Quran facts')}><div><strong>114</strong><span>{label('سورة', 'Chapters')}</span></div><div><strong>6,236</strong><span>{label('آية', 'Verses')}</span></div><div><strong>{Object.keys(lastRead).length}</strong><span>{label('سور تابعت قراءتها', 'Chapters in progress')}</span></div></div>
      {Object.entries(lastRead).length > 0 && <section className="saja-library__progress"><h2>{label('استكمل من حيث توقفت', 'Continue reading')}</h2><div className="saja-library__pills">{Object.entries(lastRead).slice(-8).reverse().map(([s, a]) => <Link key={s} to={`/mushaf/${s}?ayah=${a}`}>{getChapterName(names[Number(s) - 1], Number(s), isRTL)} · {s}:{a}</Link>)}</div></section>}
      <div className="saja-library__section"><h2>{label('اكتشف السور', 'Explore the chapters')}</h2><label className="saja-library__field">{label('البحث باسم السورة أو رقمها', 'Find a chapter')}<input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder={label('مثل: البقرة أو 2', 'e.g. Al-Baqarah or 2')} /></label>
        <div className="saja-library__chapters">{allNames.map(id => <Link to={`/mushaf/${id}`} className="saja-library__chapter" key={id}><span className="saja-library__chapter-id">{id}</span><strong>{getChapterName(names[id - 1], id, isRTL)}</strong><small>{QURAN_VERSE_COUNTS[id - 1]} {label('آية', 'verses')}</small></Link>)}</div>
        {allNames.length === 0 && <p>{label('لا توجد سورة بهذا الاسم.', 'No chapters matched.')}</p>}
      </div>
      <section className="saja-library__section"><h2>{label('البحث في جميع الآيات', 'Search all verses')}</h2><p className="saja-library__hint">{label('يُحمّل فهرس البحث المحلي عند الحاجة، دون تعديل نص الآيات المعروض.', 'The local Quran search index loads only when needed. Displayed verses are never rewritten.')}</p><label className="saja-library__field">{label('كلمة قرآنية أو مرجع', 'Arabic word or reference')}<input value={globalQuery} onChange={e => setGlobalQuery(e.target.value)} placeholder={label('ابحث بكلمتين أو أكثر من الحروف', 'Type at least two characters')} /></label>
        {searching && <p role="status">{label('تحميل فهرس الآيات…', 'Loading verse index…')}</p>}
        {globalError && <p role="alert" className="saja-library__hint">{label('فهرس البحث المحلي غير موجود. شغّل سكريبت بناء الفهرس المرفق ثم حدّث الصفحة.', 'Local search index not found. Run the bundled index builder then reload.')}</p>}
        {normalizeArabic(globalQuery).length >= 2 && searchPack && <><p className="saja-library__count">{globalResults.length}{globalResults.length === 120 ? '+' : ''} {label('نتيجة معروضة', 'visible matches')}</p><div className="saja-library__results">{globalResults.map(v => <Link className="saja-library__search-result" key={`${v.surah}:${v.ayah}`} to={`/mushaf/${v.surah}?ayah=${v.ayah}`}><span>{getChapterName(names[v.surah - 1], v.surah, isRTL)} · {v.surah}:{v.ayah}</span><p lang="ar" dir="rtl">{v.text}</p></Link>)}</div></>}
      </section>
      <p className="saja-library__source">{label('النص العربي منسوب إلى مشروع تنزيل (Tanzil). تخضع الترجمة والمواد الإضافية لمراجعة المصدر والتراخيص قبل النشر.', 'Arabic text attributed to Tanzil. Source and licensing review is required before public distribution.')} <a href="https://tanzil.net" target="_blank" rel="noreferrer">Tanzil</a></p>
    </> : <>
      <div className="saja-library__reading-tools" aria-label={label('إعدادات القراءة', 'Reading controls')}>
        <label className="saja-library__field">{label('اذهب إلى آية', 'Jump to verse')}<select value={requestedAyah ?? ''} onChange={e => jump(Number(e.target.value))}><option value="">{label('اختر رقم الآية', 'Choose verse')}</option>{Array.from({ length: QURAN_VERSE_COUNTS[n - 1] }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        <label className="saja-library__field">{label('بحث داخل السورة', 'Search this chapter')}<input value={verseQuery} onChange={e => { setVerseQuery(e.target.value); setPage(0); }} placeholder={label('كلمة أو رقم الآية', 'Arabic word or verse number')} /></label>
        <div className="saja-library__reader-options"><span>{label('حجم الخط', 'Text size')}</span><button type="button" aria-label={label('تصغير الخط', 'Smaller text')} disabled={size === 0} onClick={() => { setSize(x => { const next = Math.max(0, x - 1); try { localStorage.setItem(SIZE, String(next)); } catch { /* Storage unavailable: keep the in-memory reader size. */ } return next; }); }}>A−</button><button type="button" aria-label={label('تكبير الخط', 'Larger text')} disabled={size === 3} onClick={() => { setSize(x => { const next = Math.min(3, x + 1); try { localStorage.setItem(SIZE, String(next)); } catch { /* Storage unavailable: keep the in-memory reader size. */ } return next; }); }}>A+</button></div>
        <label className="saja-library__switch"><input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} /> {label('وضع القراءة الهادئة', 'Focus reading mode')}</label>
        <label className="saja-library__switch"><input type="checkbox" checked={showEnglish} onChange={e => setShowEnglish(e.target.checked)} /> {label('معاني الآيات بالإنجليزية', 'English meaning')}</label>
      </div>
      {error && <p className="saja-library__error" role="alert">{error}</p>}
      {!chapter && !error && <p role="status" className="saja-library__loading">{label('جارٍ تحميل النص القرآني والتحقق منه…', 'Loading and validating Quran text…')}</p>}
      {chapter && <>
        <div className="saja-library__surah-summary"><span>{label('عدد الآيات', 'Verses')} · {chapter.verses.length}</span><span>{label('أكملت القراءة حتى', 'Last marked verse')} · {lastRead[String(n)] || '—'}</span>{marks.some(x => x.startsWith(n + ':')) && <details><summary>{label('آياتي المحفوظة', 'My saved verses')}</summary><div className="saja-library__pills">{marks.filter(x => x.startsWith(n + ':')).map(k => <button type="button" key={k} onClick={() => jump(Number(k.split(':')[1]))}>{k}</button>)}</div></details>}</div>
        <p className="saja-library__source">{label('مصدر الآيات: Tanzil، الرسم العثماني. إن كانت بيانات التلاوة غير موثّقة فلن يظهر تشغيل صوتي. الترجمة عرض للمعاني فقط.', 'Arabic: Tanzil Uthmani. No recitation is offered without verified audio rights. Translation is an interpretation of meaning only.')} <a href="https://tanzil.net" target="_blank" rel="noreferrer">Tanzil</a></p>
        {showEnglish && !translation && <p className="saja-library__hint" role="status">{label('لم تتوفر الترجمة الإنجليزية؛ تظل الآيات العربية ظاهرة دون تغيير.', 'English translation unavailable; Arabic verses remain readable.')}</p>}
        {list.length === 0 && <p>{label('لا توجد آية تطابق البحث.', 'No verses match this search.')}</p>}
        <div className={compact ? 'saja-library__reading-flow' : 'saja-library__reading-cards'} style={{ ['--reader-size' as string]: `${1.9 + size * 0.23}rem` }}>
          {list.slice(shownPage * PAGE_SIZE, (shownPage + 1) * PAGE_SIZE).map(verse => {
            const key = `${n}:${verse.id}`; const saved = marks.includes(key); const concealed = hidden.includes(key);
            return <article className="saja-library__ayah" id={`saja-ayah-${n}-${verse.id}`} key={key} aria-label={`${n}:${verse.id}`}>
              <div className="saja-library__ayah-header"><strong>۞ {n}:{verse.id}</strong><div className="saja-library__ayah-actions">
                <button type="button" aria-pressed={saved} onClick={() => toggleMark(key)}>{saved ? '★' : '☆'} <span>{label('حفظ', 'Save')}</span></button>
                <button type="button" onClick={() => markReading(verse.id)}>{lastRead[String(n)] === verse.id ? '✓ ' : ''}{label('وقفت هنا', 'Mark here')}</button>
                <button type="button" onClick={() => void onCopy(key, `${verse.text} ﴿${verse.id}﴾ — ${n}:${verse.id} · Tanzil`)}>{copied === key ? label('نُسخت', 'Copied') : label('نسخ', 'Copy')}</button>
                <button type="button" aria-pressed={concealed} onClick={() => setHidden(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])}>{concealed ? label('أظهر الآية', 'Reveal') : label('اختبر حفظي', 'Hide to practice')}</button>
              </div></div>
              <p className="saja-library__verse" lang="ar" dir="rtl">{concealed ? <span className="saja-library__concealed">{label(`الآية ${verse.id} مخفية للمراجعة`, `Verse ${verse.id} hidden for practice`)}</span> : <>{verse.text} <span className="saja-library__verse-index">﴿{verse.id}﴾</span></>}</p>
              {showEnglish && translation?.verses[verse.id - 1]?.translation && !concealed && <p className="saja-library__translation" lang="en" dir="ltr">{translation.verses[verse.id - 1].translation}</p>}
            </article>;
          })}
        </div>
        {copied === 'failed' && <p role="status" className="saja-library__hint">{label('تعذر النسخ تلقائيًا من المتصفح.', 'Clipboard access is unavailable.')}</p>}
        <div className="saja-library__pagination"><button type="button" disabled={shownPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>{label('السابق', 'Previous')}</button><span>{shownPage + 1} / {maxPages}</span><button type="button" disabled={shownPage >= maxPages - 1} onClick={() => setPage(p => Math.min(maxPages - 1, p + 1))}>{label('التالي', 'Next')}</button></div>
        <section className="saja-library__quiz"><span className="saja-library__kicker">SAJA · AYAH SEQUENCE</span><h2>{label('راجع تسلسل الآيات', 'Memorize the verse sequence')}</h2><p>{label('اقرأ الآية التالية بصريًا ثم اختر النص الذي يليها. النصوص من السورة نفسها دون تعديل.', 'Choose the authentic next verse from this chapter. Original source text is never altered.')}</p>
          {quiz && <><p className="saja-library__quiz-prompt">{label(`ما الآية التي تلي الآية ${quizAyah}؟`, `Which verse follows verse ${quizAyah}?`)}</p><div className="saja-library__quiz-options">{quiz.choices.map(choice => <button type="button" key={choice.id} disabled={quizPicked !== null} data-result={quizPicked === null ? undefined : choice.id === quiz.answer ? 'correct' : quizPicked === choice.id ? 'incorrect' : undefined} onClick={() => setQuizPicked(choice.id)}><span lang="ar" dir="rtl">{choice.text}</span></button>)}</div>{quizPicked !== null && <div role="status" className="saja-library__quiz-result">{quizPicked === quiz.answer ? label('إجابة صحيحة — أحسنت المراجعة', 'Correct — well remembered') : label(`الآية الصحيحة رقم ${quiz.answer}. يمكنك مراجعتها في المصحف.`, `The correct next verse is ${quiz.answer}. Review it above.`)} <button type="button" onClick={() => { setQuizAyah(i => i + 1 >= chapter.verses.length ? 1 : i + 1); setQuizPicked(null); }}>{label('السؤال التالي', 'Next practice')}</button></div>}</>}
        </section>
        <div className="saja-library__pagination saja-library__surah-pagination">{n > 1 && <Link to={`/mushaf/${n - 1}`}>{label('السورة السابقة', 'Previous surah')}</Link>}{n < 114 && <Link to={`/mushaf/${n + 1}`}>{label('السورة التالية', 'Next surah')}</Link>}</div>
        <p className="saja-library__hint">{label('تحليل الكلمات والتفسير المُراجع متاحان حاليًا لسورة الفاتحة فقط. وضع حفظ التسلسل لا يقدّم تفسيرًا أو فتوى.', 'Curated word analysis and detailed tafsir are currently available only in Al-Fatihah Studio. Memorization practice is not tafsir.')}</p>
      </>}
    </>}
  </div>;
}
