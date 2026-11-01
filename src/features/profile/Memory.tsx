/**
 * WHAT SAJA REMEMBERS — view, edit, delete or disable each kind of memory.
 * Disabled categories are never written to the device (enforced in the
 * stores' persistence layer). Kids Mode allows only the minimum.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MODALITIES } from '@/domain/adaptive';
import { getSafetyPolicy } from '@/domain/safety';
import { Button, Switch, toast } from '@/design-system';
import { Icon, type IconName } from '@/brand/Icon';
import { useI18n, type TKey } from '@/i18n';
import { Page } from '@/app/Page';
import { useProfile, type MemoryCategory } from '@/store/profile';
import { useLearner } from '@/store/learner';
import { useDay } from '@/store/day';
import { useTutor } from '@/store/tutor';
import type { TopicId } from '@/domain/types';
import { useConnection } from '@/store/connection';
import { api } from '@/api/client';
import { refreshMe } from '@/api/sync';
import './profile.css';

const CATS: { id: MemoryCategory; icon: IconName; title: TKey; body: TKey }[] = [
  { id: 'style', icon: 'sparkle', title: 'mem.style', body: 'mem.styleBody' },
  { id: 'topics', icon: 'learn', title: 'mem.topics', body: 'mem.topicsBody' },
  { id: 'schedule', icon: 'clock', title: 'mem.schedule', body: 'mem.scheduleBody' },
  { id: 'conversations', icon: 'star', title: 'mem.conversations', body: 'mem.conversationsBody' },
];

const hh = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export default function Memory() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useProfile((s) => s.profile)!;
  const memory = useProfile((s) => s.memory);
  const setMemory = useProfile((s) => s.setMemory);
  const policy = getSafetyPolicy(profile.ageBand);
  const model = useLearner((s) => s.model);
  const prefs = useDay((s) => s.prefs);
  const turns = useTutor((s) => s.turns);
  const [open, setOpen] = useState<MemoryCategory | null>(null);
  const online = useConnection((s) => s.status === 'online' && !!s.me);

  const forget = (c: MemoryCategory) => {
    // Online, the server deletes what it stored for this category too.
    if (online) void api.del(`/profile/memory/${c}`).catch(() => toast(t('err.internal')));
    if (c === 'style') useLearner.getState().forgetStyle();
    if (c === 'topics') useLearner.getState().forgetTopics();
    if (c === 'schedule') useDay.getState().forgetSchedule();
    if (c === 'conversations') useTutor.getState().clear();
    toast(t('mem.forgotten'));
  };

  const view = (c: MemoryCategory) => {
    if (c === 'style') {
      const tried = MODALITIES.filter((m) => model.modalities[m].tries > 0);
      if (!tried.length) return <span>{t('mem.nothing')}</span>;
      return (
        <>
          {tried.map((m) => (
            <span key={m}>
              {t(`m.modeName.${m}`)} — {model.modalities[m].successes}/{model.modalities[m].tries}
            </span>
          ))}
          <span>
            {t('prof.pace')}: ~{Math.round(model.pace.avgStepMs / 1000)}s
          </span>
        </>
      );
    }
    if (c === 'topics') {
      const entries = Object.entries(model.topics) as [TopicId, { mastery: number; mistakes: number }][];
      if (!entries.length) return <span>{t('mem.nothing')}</span>;
      return entries.map(([k, v]) => (
        <span key={k}>
          {t(`prof.topic.${k}`)} — {Math.round(v.mastery * 100)}%
        </span>
      ));
    }
    if (c === 'schedule')
      return (
        <>
          <span>
            {t('day.wake')} {hh(prefs.wake)} · {t('day.sleep')} {hh(prefs.sleep)}
          </span>
          {prefs.commitments.map((x) => (
            <span key={x.id}>
              {t('day.commitment')} {hh(x.start)}–{hh(x.end)}
            </span>
          ))}
          <span>
            {t('day.studyTime')}: {t(`day.study.${prefs.studyTime}`)}
          </span>
        </>
      );
    return <span>{turns.length ? `${turns.length} ·  ${t('tutor.title')}` : t('mem.nothing')}</span>;
  };

  return (
    <Page eyebrow={t('nav.profile')} title={t('mem.title')} sub={online ? t('mem.subOnline') : t('mem.sub')} actions={<Button variant="ghost" icon="back" onClick={() => navigate('/profile')}>{t('a.back')}</Button>}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <p className="t-small muted">
          <Icon name={online ? 'cloud' : 'lock'} size={14} /> {online ? t('mem.whereServer') : t('mem.whereDevice')}
        </p>
        {CATS.map((c) => {
          const allowed = policy.memoryAllowed.includes(c.id);
          const on = memory[c.id] && allowed;
          return (
            <section key={c.id} className="card mem-card" aria-labelledby={`mem-${c.id}`}>
              <div className="mem-head">
                <span className="tile__icon">
                  <Icon name={c.icon} size={20} />
                </span>
                <div style={{ flex: 1 }}>
                  <h2 id={`mem-${c.id}`} className="t-h3" style={{ fontSize: '1.0625rem' }}>
                    {t(c.title)}
                  </h2>
                  <p className="t-small muted">{t(c.body)}</p>
                  <p className="t-small" style={{ marginTop: 4, color: on ? '#9fe3c9' : 'var(--text-muted)' }}>
                    {!allowed ? (
                      <>
                        <Icon name="lock" size={12} /> {t('mem.lockedKids')}
                      </>
                    ) : on ? (
                      t('mem.on')
                    ) : (
                      t('mem.off')
                    )}
                  </p>
                </div>
                <Switch
                  checked={on}
                  disabled={!allowed}
                  onChange={async (v) => {
                    if (online) {
                      // The server is the authority: it refuses categories outside the age policy and deletes data when switched off.
                      try {
                        await api.put('/profile/memory', { ...memory, [c.id]: v });
                        await refreshMe();
                      } catch {
                        toast(t('err.internal'));
                        return;
                      }
                    }
                    setMemory(c.id, v);
                    // Re-persist so data from a category just switched off is removed from the device now.
                    useLearner.setState({});
                    useDay.setState({});
                    useTutor.setState({});
                  }}
                  label={t(c.title)}
                />
              </div>
              <div className="row wrap">
                <Button size="sm" variant="secondary" icon="eye" aria-expanded={open === c.id} onClick={() => setOpen((o) => (o === c.id ? null : c.id))}>
                  {t('mem.view')}
                </Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={() => forget(c.id)}>
                  {t('mem.forget')}
                </Button>
              </div>
              <AnimatePresence>
                {open === c.id && (
                  <motion.div className="mem-data" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {view(c.id)}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
