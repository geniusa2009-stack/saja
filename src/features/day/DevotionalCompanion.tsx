import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { useConnection } from '@/store/connection';
import { useDay, todayKey } from '@/store/day';
import { api } from '@/api/client';
import { enablePush, pushState, type PushState } from '@/api/push';
import { AdhanPlayer } from './AdhanPlayer';

type Kind = 'morning' | 'evening';
type Routine = { kind: Kind; enabled: boolean; time: string; timeZone: string };
type Pref = { inApp: boolean; push: boolean };
type Prefs = { categories: Record<string, Pref>; pushAllowed: boolean };
const KINDS: Kind[] = ['morning', 'evening'];
const defaults = (tz: string): Routine[] => [
  { kind: 'morning', enabled: false, time: '07:00', timeZone: tz },
  { kind: 'evening', enabled: false, time: '17:00', timeZone: tz },
];

export function DevotionalCompanion({ timeZone, placeLabel }: { timeZone: string; placeLabel: string }) {
  const { l } = useI18n();
  const profile = useProfile((s) => s.profile);
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const doneToday = useDay((s) => s.done[todayKey()] ?? []);
  const toggleDone = useDay((s) => s.toggleDone);
  const [routines, setRoutines] = useState<Routine[]>(() => defaults(timeZone));
  const [serverReady, setServerReady] = useState(false);
  const [busy, setBusy] = useState<Kind | 'push' | null>(null);
  const [push, setPush] = useState<PushState | 'loading'>('loading');
  const [pushForAdhkar, setPushForAdhkar] = useState(false);
  const [message, setMessage] = useState('');
  const isChild = profile?.ageBand === 'child';

  useEffect(() => {
    let active = true;
    if (!online) { setServerReady(false); setRoutines(defaults(timeZone)); return; }
    void Promise.all([
      api.get<{ routines: Routine[] }>('/notifications/routines'),
      api.get<Prefs>('/notifications/preferences'),
    ]).then(([r, p]) => {
      if (!active) return;
      setRoutines(r.routines.map((item) => ({ ...item, timeZone: item.timeZone === 'UTC' && !item.enabled ? timeZone : item.timeZone })));
      setPushForAdhkar(Boolean(p.categories.adhkar?.push));
      setServerReady(true);
    }).catch(() => { if (active) { setMessage(l({ ar: 'تعذّر تحميل إعدادات التذكير.', en: 'Unable to load reminder settings.' })); setServerReady(false); } });
    if (!isChild) void pushState().then((state) => { if (active) setPush(state); }).catch(() => { if (active) setPush('unsupported'); });
    return () => { active = false; };
  }, [online, timeZone, isChild]); // Locale messages update only on the next user action.

  const patch = (kind: Kind, part: Partial<Routine>) =>
    setRoutines((current) => current.map((r) => r.kind === kind ? { ...r, ...part } : r));

  const save = async (kind: Kind, enabled?: boolean) => {
    if (!online || !serverReady) { setMessage(l({ ar: 'التذكير المتكرر يحتاج حسابًا متصلًا بالخادم.', en: 'Recurring reminders require a connected account.' })); return; }
    const routine = routines.find((r) => r.kind === kind)!;
    const next = { ...routine, enabled: enabled ?? routine.enabled };
    setBusy(kind);
    try {
      const result = await api.put<{ routine: Routine }>(`/notifications/routines/${kind}`, {
        enabled: next.enabled, time: next.time, timeZone: next.timeZone,
      });
      patch(kind, result.routine);
      setMessage(l({ ar: next.enabled ? 'اتحفظ الموعد. التذكير اختياري ويمكن إيقافه في أي وقت.' : 'تم إيقاف التذكير.', en: next.enabled ? 'Saved. You can switch this reminder off anytime.' : 'Reminder switched off.' }));
    } catch {
      setMessage(l({ ar: 'لم يُحفظ التذكير؛ جرّب مجددًا.', en: 'Reminder was not saved. Please retry.' }));
    } finally { setBusy(null); }
  };

  const turnOnPush = async () => {
    if (isChild || !online || !serverReady) return;
    setBusy('push');
    try {
      // Permission is requested ONLY from an explicit button click.
      const status = await enablePush();
      setPush(status);
      if (status !== 'on') {
        setMessage(l({ ar: 'الإشعارات الخارجية غير متاحة أو لم يُسمح بها. تظل التذكيرات داخل سجى متاحة.', en: 'System notifications are unavailable or not permitted. In-app reminders remain available.' }));
        return;
      }
      const prefs = await api.get<Prefs>('/notifications/preferences');
      await api.put('/notifications/preferences', {
        categories: { ...prefs.categories, adhkar: { inApp: true, push: true } },
      });
      setPushForAdhkar(true);
      setMessage(l({ ar: 'تم تفعيل إشعارات الأذكار خارج التطبيق.', en: 'System reminders for adhkar are enabled.' }));
    } catch {
      setMessage(l({ ar: 'تعذّر تفعيل Push. راجع اتصال الخادم.', en: 'Could not enable push; check the server connection.' }));
    } finally { setBusy(null); }
  };

  const turnOffPush = async () => {
    if (!online || !serverReady) return;
    setBusy('push');
    try {
      const prefs = await api.get<Prefs>('/notifications/preferences');
      await api.put('/notifications/preferences', {
        categories: { ...prefs.categories, adhkar: { inApp: true, push: false } },
      });
      setPushForAdhkar(false);
      setMessage(l({ ar: 'تم إيقاف إشعارات الأذكار الخارجية.', en: 'System adhkar notifications are off.' }));
    } catch { setMessage(l({ ar: 'تعذّر تغيير الإعداد.', en: 'Unable to change that setting.' })); }
    finally { setBusy(null); }
  };

  return <section id="remembrance" className="card day-remembrance" aria-labelledby="remembrance-heading">
    <div className="day-remembrance__intro">
      <div>
        <span className="t-caption gold">SAJA · DAILY COMPANION</span>
        <h2 className="section__title" id="remembrance-heading">{l({ ar: 'أذكار ووقفة لطيفة في يومك', en: 'Remembrance and a gentle pause' })}</h2>
        <p className="t-small muted">{l({ ar: 'اختار اللي يناسبك، ومفيش عقوبة أو نقاط أقل لو فوتّ حاجة. جدولك ملكك.', en: 'Choose what suits you. No penalties, streaks or score reductions for missing anything.' })}</p>
      </div>
      <Link to="/hadith-library" className="day-source-link">{l({ ar: 'مكتبة الأدعية والمصادر', en: 'Sources and supplications' })}</Link>
    </div>
    <div className="day-remembrance__grid">
      {KINDS.map((kind) => {
        const routine = routines.find((r) => r.kind === kind)!;
        const isDone = doneToday.includes(`adhkar:${kind}`);
        const title = kind === 'morning' ? { ar: 'أذكار الصباح', en: 'Morning remembrance' } : { ar: 'أذكار المساء', en: 'Evening remembrance' };
        return <article key={kind} className="day-remembrance__panel">
          <div className="day-remembrance__row">
            <h3>{l(title)}</h3>
            <button type="button" className="chip chip--quiet" aria-pressed={isDone} onClick={() => toggleDone(`adhkar:${kind}`)}>
              {isDone ? l({ ar: 'تم اليوم ✓', en: 'Done today ✓' }) : l({ ar: 'علّمها لنفسك', en: 'Mark for myself' })}
            </button>
          </div>
          <p className="t-small muted">{kind === 'morning'
            ? l({ ar: 'وقت هادئ بعد بداية اليوم؛ من غير وقت إلزامي داخل التطبيق.', en: 'A calm moment early in the day; no app-imposed obligation.' })
            : l({ ar: 'دقائق للذكر والهدوء قبل نهاية اليوم.', en: 'A few minutes of quiet remembrance before the day ends.' })}</p>
          <div className="day-remembrance__row">
            <label htmlFor={`routine-${kind}`}>{l({ ar: 'وقت التذكير', en: 'Reminder time' })}</label>
            <input id={`routine-${kind}`} className="input" type="time" value={routine.time}
              onChange={(e) => patch(kind, { time: e.target.value })} />
          </div>
          <div className="day-remembrance__row">
            <button type="button" className="day-save-button" disabled={busy !== null || !online || !serverReady} onClick={() => void save(kind, !routine.enabled)}>
              {routine.enabled ? l({ ar: 'إيقاف التذكير', en: 'Switch reminder off' }) : l({ ar: 'تفعيل تذكير يومي', en: 'Enable daily reminder' })}
            </button>
            {routine.enabled && <button className="chip chip--quiet" type="button" disabled={busy !== null} onClick={() => void save(kind)}>
              {l({ ar: 'حفظ الوقت', en: 'Save time' })}
            </button>}
          </div>
          <p className="t-small muted">{l({ ar: `المنطقة الزمنية: ${routine.timeZone}`, en: `Time zone: ${routine.timeZone}` })}</p>
        </article>;
      })}
    </div>
    <div className="day-remembrance__push">
      <p className="t-small muted">{l({ ar: `المواقيت مرتبطة بمكان الصلاة: ${placeLabel}. التذكيرات تستخدم المنطقة الزمنية المختارة، وليست حسابًا للثواب أو التأخر.`, en: `Prayer location: ${placeLabel}. Reminder times use your selected time zone; we do not score religious practice.` })}</p>
      {!online && <p className="t-small muted">{l({ ar: 'تقدر تستخدم وردك وجدولك بدون حساب؛ التذكيرات بالخلفية تحتاج تسجيل دخول.', en: 'Your routine works without an account; background reminders require signing in.' })}</p>}
      {!isChild && online && <div className="day-remembrance__row">
        <button className="day-save-button" type="button" disabled={busy !== null || !serverReady} onClick={() => void (pushForAdhkar ? turnOffPush() : turnOnPush())}>
          {pushForAdhkar ? l({ ar: 'إيقاف إشعارات الهاتف', en: 'Disable system notifications' }) : l({ ar: 'السماح بإشعارات الهاتف', en: 'Allow system notifications' })}
        </button>
        <span className="t-small muted">{push === 'loading' ? '…' : push}</span>
      </div>}
      {isChild && <p className="t-small muted">{l({ ar: 'الإشعارات الخارجية متوقفة في وضع الأطفال.', en: 'System push is disabled in Kids Mode.' })}</p>}
      {message && <p role="status" className="day-remembrance__message">{message}</p>}
    </div>
    <div className="day-remembrance__guidance">
      <h3>{l({ ar: 'معنى نحافظ عليه', en: 'A principle worth remembering' })}</h3>
      <p>{l({ ar: 'الصدقة من غير مَنّ ولا أذى. النص القرآني: البقرة ٢:٢٦٤. لا نقيس حسنات الناس ولا نحكم عليهم.', en: 'Give without reminders of generosity or hurtful words. Qur’an 2:264; SAJA does not calculate anyone’s reward.' })}</p>
      <p className="t-small muted">{l({ ar: 'محتوى إرشادي قيد المراجعة المتخصصة قبل النشر العام.', en: 'Editorial guidance awaiting specialist review before public release.' })}</p>
      <Link to="/mushaf/2">{l({ ar: 'افتح سورة البقرة في المصحف', en: 'Open Surah Al-Baqarah' })}</Link>
    </div>
    <AdhanPlayer />
  </section>;
}
