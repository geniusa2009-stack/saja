import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import { useConnection } from '@/store/connection';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { CITIES, PRAYERS, type PrayerName } from '@/domain/prayerTimes';
import { PRAYER_NAMES } from '@/app/hooks';
import { api } from '@/api/client';

type Prayer = Exclude<PrayerName, 'sunrise'>;
type AlertPrefs = { enabled: boolean; prayers: Prayer[]; locationConfigured: boolean };

/** Daily prayer reminders are opt-in, with explicit city confirmation. */
export function DailyPrayerAlerts({ placeLabel }: { placeLabel: string }) {
  const { l } = useI18n();
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const child = useProfile((s) => s.profile?.ageBand === 'child');
  const place = useSettings((s) => s.prayerPlace);
  const method = useSettings((s) => s.method);
  const asr = useSettings((s) => s.asr);
  const [prefs, setPrefs] = useState<AlertPrefs>({ enabled: false, prayers: [...PRAYERS], locationConfigured: false });
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!online) { setReady(false); return; }
    void api.get<AlertPrefs>('/notifications/prayer-alerts').then((r) => {
      if (active) { setPrefs(r); setReady(true); }
    }).catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, [online]);

  const togglePrayer = (prayer: Prayer) => setPrefs((old) => ({
    ...old, prayers: old.prayers.includes(prayer)
      ? old.prayers.filter((p) => p !== prayer)
      : PRAYERS.filter((p) => p === prayer || old.prayers.includes(p)),
  }));

  const save = async (enabled: boolean) => {
    if (!online || !ready) return;
    setBusy(true);
    try {
      if (enabled) {
        const city = CITIES.find((c) => c.id === place.cityId) ?? CITIES[0];
        const custom = place.custom;
        // Save the exact same coarsened location/settings used in MyDay.
        await api.put('/prayer/preferences', {
          cityId: custom ? null : city.id,
          coords: custom ? { lat: custom.lat, lng: custom.lng } : null,
          timeZone: custom?.timeZone ?? city.timeZone,
          method, asr,
        });
      }
      const updated = await api.put<AlertPrefs>('/notifications/prayer-alerts', {
        enabled, prayers: prefs.prayers,
      });
      setPrefs(updated);
      setMessage(l({
        ar: enabled ? 'اتحفظت تنبيهات الصلاة حسب مواقيت مدينتك، وتقدر توقفها في أي وقت.' : 'تم إيقاف التنبيهات اليومية للصلاة.',
        en: enabled ? 'Prayer-time reminders are saved for your city. You can switch them off anytime.' : 'Daily prayer alerts are off.',
      }));
    } catch {
      setMessage(l({ ar: 'تعذّر حفظ تنبيهات الصلاة. راجع الاتصال والمدينة المختارة.', en: 'Could not save prayer reminders. Check the connection and your selected city.' }));
    } finally { setBusy(false); }
  };

  return <section className="day-prayer-alerts" aria-labelledby="day-prayer-alerts-title">
    <h3 id="day-prayer-alerts-title">{l({ ar: 'تنبيهات الصلوات الخمس', en: 'Daily prayer-time reminders' })}</h3>
    <p className="t-small muted">{l({
      ar: 'لو حابب، تقدر تختار الصلوات اللي يوصلك وقتها تنبيه هادئ. مش بنشغّل صوت أذان تلقائيًا، ومش بنسجل إذا صليت أو لأ.',
      en: 'Choose which prayer times you want gentle alerts for. No automatic adhan audio and no record of whether you prayed.',
    })}</p>
    <p className="t-small muted">{l({ ar: `المدينة الحالية: ${placeLabel}. غيّرها من قائمة مواقيت الصلاة بالأعلى.`, en: `Current prayer place: ${placeLabel}. Change it in the prayer-times panel above.` })}</p>
    <fieldset className="day-prayer-alerts__choices">
      <legend>{l({ ar: 'اختار الصلوات', en: 'Choose prayers' })}</legend>
      {PRAYERS.map((p) => <label key={p}>
        <input type="checkbox" checked={prefs.prayers.includes(p)} onChange={() => togglePrayer(p)} />
        {l(PRAYER_NAMES[p])}
      </label>)}
    </fieldset>
    {!prefs.enabled && <label className="day-prayer-alerts__confirm">
      <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
      {l({ ar: `أؤكد أن ${placeLabel} هي المدينة المناسبة لمواقيتي.`, en: `I confirm ${placeLabel} is the correct prayer location for me.` })}
    </label>}
    <div className="day-remembrance__row">
      <button className="day-save-button" disabled={!online || !ready || busy || (prefs.enabled ? false : !confirmed || !prefs.prayers.length)}
        onClick={() => void save(!prefs.enabled)}>
        {prefs.enabled ? l({ ar: 'إيقاف تنبيهات الصلاة', en: 'Disable prayer alerts' }) : l({ ar: 'تفعيل تنبيهات الصلاة', en: 'Enable prayer alerts' })}
      </button>
      {prefs.enabled && <button className="chip chip--quiet" type="button" disabled={busy || !prefs.prayers.length} onClick={() => void save(true)}>
        {l({ ar: 'حفظ الصلوات المختارة', en: 'Save selected prayers' })}
      </button>}
    </div>
    {child && <p className="t-small muted">{l({ ar: 'في وضع الأطفال، التنبيهات داخل التطبيق فقط؛ Push الخارجي غير متاح.', en: 'In Kids Mode reminders stay in-app; system push is disabled.' })}</p>}
    {!online && <p className="t-small muted">{l({ ar: 'التنبيهات المتكررة تحتاج تسجيل الدخول إلى خادم سجى.', en: 'Recurring alerts require a connected SAJA account.' })}</p>}
    {message && <p role="status" className="day-remembrance__message">{message}</p>}
  </section>;
}
