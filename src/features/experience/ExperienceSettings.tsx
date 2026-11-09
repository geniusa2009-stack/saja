import type { ChangeEvent } from 'react';
import { defaultDisplay, displayFor, useExperience } from './experienceStore';
import { useProfile } from '@/store/profile';
import { useI18n } from '@/i18n';
import { TOPICS } from '@/content/topics';
import type { Level, Purpose, TopicId } from '@/domain/types';
import './experience.css';

export function ExperienceSettings() {
  const profile = useProfile((s) => s.profile)!;
  const updateProfile = useProfile((s) => s.updateProfile);
  const byTraveller = useExperience((s) => s.byTraveller);
  const setDisplay = useExperience((s) => s.setDisplay);
  const { l, t } = useI18n();
  const display = displayFor(profile, byTraveller);
  const change = (patch: Parameters<typeof setDisplay>[2]) => setDisplay(profile.createdAt, defaultDisplay(profile), patch);
  const toggleTopic = (topic: TopicId) => updateProfile({ interests: profile.interests.includes(topic) ? profile.interests.filter((t) => t !== topic) : [...profile.interests, topic] });
  return <section id="experience" className="exps" aria-labelledby="exps-title">
    <h2 id="exps-title">{l({ ar: 'تخصيص تجربتي', en: 'Personalise my experience' })}</h2>
    <p className="muted">{l({ ar: 'اختياراتك تحدد المقترحات، ومش بتغير عمرك أو إعدادات الأمان أو تقدمك.', en: 'Your choices shape suggestions without changing your age, safety controls or progress.' })}</p>
    {profile.ageBand !== 'child' && <div className="exps-field">
      <label htmlFor="exps-path">{l({ ar: 'هدفي من استخدام سجى', en: 'My learning goal' })}</label>
      <select id="exps-path" value={profile.purpose === 'child' ? 'learn-more' : profile.purpose} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateProfile({ purpose: e.target.value as Purpose })}>
        <option value="exploring">{l({ ar: 'التعرف على الإسلام', en: 'Explore Islam' })}</option>
        <option value="new-muslim">{l({ ar: 'البدء من الأساسيات', en: 'Start with the foundations' })}</option>
        <option value="learn-more">{l({ ar: 'التعمق في المعرفة', en: 'Deepen my knowledge' })}</option>
      </select>
    </div>}
    <div className="exps-field">
      <label htmlFor="exps-level">{l({ ar: 'مستوى الشرح المفضل', en: 'Preferred depth' })}</label>
      <select id="exps-level" value={profile.level} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateProfile({ level: e.target.value as Level })}>
        <option value="beginner">{l({ ar: 'أساسيات بسيطة', en: 'Gentle foundations' })}</option>
        <option value="some">{l({ ar: 'شرح متوسط', en: 'Intermediate' })}</option>
        <option value="confident">{l({ ar: 'شرح متقدم', en: 'In-depth' })}</option>
      </select>
    </div>
    <fieldset className="exps-topics"><legend>{l({ ar: 'الموضوعات التي تهمني', en: 'Subjects I am interested in' })}</legend>
      {TOPICS.map((topic) => <button key={topic} type="button" className="exps-topic" aria-pressed={profile.interests.includes(topic)} onClick={() => toggleTopic(topic)}>{t(`prof.topic.${topic}`)}</button>)}
    </fieldset>
    <fieldset className="exps-switches"><legend>{l({ ar: 'ماذا يظهر في الصفحة الرئيسية؟', en: 'What appears on my home page?' })}</legend>
      {([
        ['showStories', { ar: 'الحكايات الخيالية', en: 'Fictional stories' }],
        ['showWorld', { ar: 'العالم والألعاب التفاعلية', en: 'Interactive world' }],
        ['showAdvanced', { ar: 'المحتوى المتقدم', en: 'Advanced study' }],
      ] as const).map(([key, label]) => <label key={key} className="exps-switch"><input type="checkbox" checked={display[key]} onChange={(e: ChangeEvent<HTMLInputElement>) => change(key === 'showStories' ? { showStories: e.target.checked } : key === 'showWorld' ? { showWorld: e.target.checked } : { showAdvanced: e.target.checked })}/>{l(label)}</label>)}
    </fieldset>
    <p className="exps-note">{l({ ar: 'إعدادات عرض المحتوى محفوظة على هذا الجهاز فقط. كل الأقسام المناسبة لعمرك متاحة من فهرس المحتوى، حتى لو أخفيتها من الرئيسية. تغيير المسار لا يغيّر العمر أو إذن ولي الأمر.', en: 'Display preferences are saved on this device. Age-appropriate sections stay available in the catalogue. Changing your path does not change age or guardian consent.' })}</p>
  </section>;
}
