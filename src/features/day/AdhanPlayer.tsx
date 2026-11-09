import { useSettings } from '@/store/settings';
import { useI18n } from '@/i18n';

/**
 * Listen on demand only, not autoplay. Both CC0 recordings and the CC BY-SA
 * option are sourced from Wikimedia Commons and retain attribution links.
 * Streaming previews require the user's action and a network connection.
 */
export const ADHAN_RECORDINGS = [
  {
    id: 'beautiful',
    name: { ar: 'أذان بصوت مطوّل', en: 'Extended adhan' },
    author: 'Adam-synagda',
    license: 'CC0 1.0',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg',
    source: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg',
  },
  {
    id: 'short',
    name: { ar: 'نداء قصير', en: 'Short call' },
    author: 'Aishatu98',
    license: 'CC0 1.0',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Adhan.ogg',
    source: 'https://commons.wikimedia.org/wiki/File:Adhan.ogg',
  },
  {
    id: 'classic',
    name: { ar: 'أذان تقليدي', en: 'Traditional adhan' },
    author: 'Andrewler',
    license: 'CC BY-SA 4.0',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Azan.ogg',
    source: 'https://commons.wikimedia.org/wiki/File:Azan.ogg',
  },
] as const;

export function AdhanPlayer() {
  const { l } = useI18n();
  const voice = useSettings((s) => s.adhanVoice) ?? 'silent';
  const setVoice = useSettings((s) => s.setAdhanVoice);
  const selected = ADHAN_RECORDINGS.find((r) => r.id === voice);
  return <section className="card card--flat adhan-settings" aria-labelledby="adhan-heading">
    <div>
      <h3 id="adhan-heading">{l({ ar: 'استمع للأذان', en: 'Listen to the adhan' })}</h3>
      <p className="t-small muted">{l({ ar: 'اختار التسجيل اللي ترتاح له. الاستماع يدوي فقط؛ إشعارات الصلاة لا تشغّل صوتًا تلقائيًا.', en: 'Choose a recording you like. Playback is manual only; prayer notifications do not autoplay audio.' })}</p>
    </div>
    <label className="day-time-label" htmlFor="adhan-voice">{l({ ar: 'التسجيل المختار', en: 'Recording' })}</label>
    <select className="input" id="adhan-voice" value={voice} onChange={(e) => setVoice(e.target.value as typeof voice)}>
      <option value="silent">{l({ ar: 'صامت — بدون صوت', en: 'Silent — no audio' })}</option>
      {ADHAN_RECORDINGS.map((r) => <option key={r.id} value={r.id}>{l(r.name)}</option>)}
    </select>
    {selected && <div className="adhan-preview">
      <audio key={selected.id} controls preload="none" src={selected.audio} aria-label={l(selected.name)} />
      <p className="t-small muted">{l({ ar: 'المصدر والتسجيل:', en: 'Recording and source:' })} <a href={selected.source} target="_blank" rel="noopener noreferrer">{selected.author} · {selected.license}</a></p>
      <p className="t-small muted">{l({ ar: 'الاستماع يطلب ملفًا من Wikimedia Commons. قد لا يعمل بدون إنترنت.', en: 'Playback fetches audio from Wikimedia Commons and needs internet.' })}</p>
    </div>}
  </section>;
}
