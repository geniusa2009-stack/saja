/**
 * Ask a Scholar — real questions go to qualified people.
 * The AI may help ORGANISE a question (structure, topic, privacy); it never
 * answers it and never speaks as a scholar.
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { L10n, TopicId } from '@/domain/types';
import { organizeQuestion, SCHOLARS, type OrganizedQuestion, type ScholarQuestion } from '@/services/scholar';
import { Button, Chip, DemoNote, EmptyState, Field, Section, TextArea, VerifiedBadge, toast } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { useScholar } from '@/store/scholar';
import { useTutor } from '@/store/tutor';
import { useConnection } from '@/store/connection';
import { api, ApiError } from '@/api/client';
import { onServerEvent } from '@/api/sync';
import './scholar.css';

/** One shape for questions whether they come from the server or the offline demo store. */
interface QView {
  id: string;
  question: string;
  context?: string | null;
  status: 'held' | 'queued' | 'assigned' | 'answered' | 'rejected' | 'pending';
  createdAt: number;
  answer?: {
    text: L10n;
    sources: string[];
    answeredAt: number;
    scholar: { name: string; title: L10n; specialization: L10n; verified: boolean; sample: boolean; scope?: string | null };
  };
}

interface ServerQ {
  id: string;
  question: string;
  context: string | null;
  status: QView['status'];
  created_at: string;
  answer: null | {
    body: { en?: string; ar?: string };
    sources: string[];
    createdAt: string;
    isDemo: boolean;
    scholar: { name: string; title: L10n; specialization: L10n; verification: string; scope: string | null; isDemo: boolean };
  };
}

function fromServer(q: ServerQ): QView {
  const a = q.answer;
  return {
    id: q.id,
    question: q.question,
    context: q.context,
    status: q.status,
    createdAt: Date.parse(q.created_at),
    answer: a
      ? {
          // One language may be missing: show whichever the scholar wrote.
          text: { en: a.body.en || a.body.ar || '', ar: a.body.ar || a.body.en || '' },
          sources: a.sources,
          answeredAt: Date.parse(a.createdAt),
          // VERIFIED is shown only when the server says so AND the profile is not demo data.
          scholar: { name: a.scholar.name, title: a.scholar.title, specialization: a.scholar.specialization, verified: a.scholar.verification === 'verified' && !a.scholar.isDemo && !a.isDemo, sample: a.scholar.isDemo || a.isDemo, scope: a.scholar.scope },
        }
      : undefined,
  };
}

function fromLocal(q: ScholarQuestion): QView {
  const sch = q.answer ? SCHOLARS[q.answer.scholarId] : undefined;
  return {
    id: q.id,
    question: q.question,
    context: q.context,
    status: q.status,
    createdAt: q.createdAt,
    answer:
      q.answer && sch
        ? { text: q.answer.text, sources: q.answer.sources, answeredAt: q.answer.answeredAt, scholar: { name: sch.name, title: sch.title, specialization: sch.specialization, verified: false, sample: sch.sample } }
        : undefined,
  };
}

const TOPICS: (TopicId | 'other')[] = ['prayer', 'purification', 'fasting', 'quran', 'beliefs', 'character', 'other'];

export default function AskScholar() {
  const { t } = useI18n();
  const questions = useScholar((s) => s.questions);
  const draft = useScholar((s) => s.draft);
  const submit = useScholar((s) => s.submit);
  const withdraw = useScholar((s) => s.withdraw);
  const [q, setQ] = useState(draft);
  const [context, setContext] = useState('');
  const [topic, setTopic] = useState<TopicId | 'other'>('other');
  const [organized, setOrganized] = useState<OrganizedQuestion | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [sending, setSending] = useState(false);
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const [server, setServer] = useState<{ mine: QView[]; samples: QView[] } | null>(null);

  useEffect(() => {
    if (draft) setQ(draft);
  }, [draft]);

  const load = useCallback(async () => {
    try {
      const [m, sm] = await Promise.all([api.get<{ questions: ServerQ[] }>('/scholar/questions'), api.get<{ questions: ServerQ[] }>('/scholar/samples')]);
      setServer({ mine: m.questions.map(fromServer), samples: sm.questions.map(fromServer) });
    } catch {
      setServer((cur) => cur ?? { mine: [], samples: [] });
    }
  }, []);
  useEffect(() => {
    if (online) void load();
  }, [online, load]);
  useEffect(() => onServerEvent('scholar.update', () => void load()), [load]);

  const errText = (e: unknown) => (e instanceof ApiError ? (e.code === 'rate_limited' ? t('err.rate_limited') : e.message) : t('err.internal'));

  const organize = async () => {
    setOrganizing(true);
    try {
      const o = online ? await api.post<OrganizedQuestion>('/scholar/organize', { question: q, context: context || undefined }) : (await new Promise((r) => setTimeout(r, 600)), organizeQuestion(q, context));
      setOrganized(o);
      setQ(o.question);
      if (o.topic !== 'other') setTopic(o.topic);
    } catch (e) {
      toast(errText(e));
    } finally {
      setOrganizing(false);
    }
  };

  const send = async () => {
    if (online) {
      setSending(true);
      try {
        const r = await api.post<{ question: ServerQ }>('/scholar/questions', { question: q.trim(), context: context.trim() || undefined, topic, aiAssisted: !!organized });
        toast(r.question.status === 'held' ? t('sch.held') : t('sch.submitted'));
        void load();
      } catch (e) {
        toast(errText(e));
        return;
      } finally {
        setSending(false);
      }
    } else {
      submit({ question: q.trim(), context: context.trim() || undefined, topic });
      toast(t('sch.submittedOffline'));
    }
    setQ('');
    setContext('');
    setOrganized(null);
    useScholar.getState().setDraft('');
  };

  const withdrawQ = async (id: string) => {
    if (!online) return withdraw(id);
    try {
      await api.del(`/scholar/questions/${id}`);
      void load();
    } catch (e) {
      toast(errText(e));
    }
  };

  const mine = online ? (server?.mine ?? []) : questions.filter((x) => !x.id.startsWith('sample')).map(fromLocal);
  const samples = online ? (server?.samples ?? []) : questions.filter((x) => x.id.startsWith('sample')).map(fromLocal);

  return (
    <Page eyebrow={t('nav.scholar')} title={t('sch.title')} sub={t('sch.sub')}>
      <div className="sch-grid">
        <section className="card card--raised sch-form" aria-labelledby="ask-h">
          <h2 id="ask-h" className="sr-only">
            {t('sch.ask')}
          </h2>
          <Field label={t('sch.ask')} htmlFor="sch-q">
            <TextArea id="sch-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sch.askPh')} maxLength={1000} rows={4} />
          </Field>
          <Field label={t('sch.context')} htmlFor="sch-c">
            <TextArea id="sch-c" value={context} onChange={(e) => setContext(e.target.value)} placeholder={t('sch.contextPh')} maxLength={1000} rows={3} />
          </Field>
          <fieldset className="fieldset">
            <legend className="field__label">{t('sch.topic')}</legend>
            <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
              {TOPICS.map((tp) => (
                <Chip key={tp} onClick={() => setTopic(tp)} pressed={topic === tp}>
                  {tp === 'other' ? t('sch.topic.other') : t(`prof.topic.${tp}`)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <AnimatePresence>
            {organized && (
              <motion.div className="sch-organized" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <p className="row" style={{ '--row-gap': '8px' } as React.CSSProperties}>
                  <span className="siraj-orb siraj-orb--sm" aria-hidden>
                    <Star size={12} color="currentColor" />
                  </span>
                  <strong>{t('sch.organized')}</strong>
                </p>
                {organized.removedPersonalInfo && (
                  <p className="t-small">
                    <Icon name="shield" size={14} /> {t('sch.removedInfo')}
                  </p>
                )}
                {organized.clarifiers.length > 0 && (
                  <div>
                    <p className="t-caption muted">{t('sch.clarify')}</p>
                    <ul className="sch-list">
                      {organized.clarifiers.map((c, i) => (
                        <ClarifierLine key={i} text={c} />
                      ))}
                    </ul>
                  </div>
                )}
                {organized.related.length > 0 && <Related items={organized.related} />}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="row wrap">
            <Button variant="secondary" icon="wand" onClick={organize} loading={organizing} disabled={q.trim().length < 8}>
              {organizing ? t('sch.organizing') : t('sch.organize')}
            </Button>
            <span className="spacer" />
            <Button variant="emerald" iconEnd="send" onClick={send} loading={sending} disabled={q.trim().length < 8 || sending}>
              {t('sch.submit')}
            </Button>
          </div>
          <p className="t-small muted row" style={{ '--row-gap': '6px' } as React.CSSProperties}>
            <Icon name="info" size={14} /> {t('sch.aiNever')}
          </p>
          {online ? (
            <p className="t-small muted row" style={{ '--row-gap': '6px' } as React.CSSProperties}>
              <Icon name="shield" size={14} /> {t('sch.onlineNote')}
            </p>
          ) : (
            <DemoNote>{t('sch.offlineNote')}</DemoNote>
          )}
        </section>

        <div className="stack" style={{ '--stack-gap': '28px' } as React.CSSProperties}>
          <Section title={t('sch.yourQuestions')} id="yq">
            {mine.length === 0 ? (
              <div className="card card--flat">
                <EmptyState icon="scholar" title={t('sch.empty')} />
              </div>
            ) : (
              <div className="stack">
                {mine.map((x) => (
                  <QuestionCard key={x.id} q={x} onWithdraw={() => void withdrawQ(x.id)} />
                ))}
              </div>
            )}
          </Section>
          <Section title={t('sch.examples')} id="ex">
            <div className="stack">
              {samples.map((x) => (
                <QuestionCard key={x.id} q={x} />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function ClarifierLine({ text }: { text: { en: string; ar: string } }) {
  const { l } = useI18n();
  return (
    <li className="t-small">
      <Icon name="forward" size={12} className="flip-rtl" /> {l(text)}
    </li>
  );
}

function Related({ items }: { items: OrganizedQuestion['related'] }) {
  const { t, l } = useI18n();
  const showEvidence = useTutor((s) => s.showEvidence);
  return (
    <div>
      <p className="t-caption muted">{t('sch.related')}</p>
      <div className="row wrap" style={{ '--row-gap': '6px', marginTop: 6 } as React.CSSProperties}>
        {items.map((r) => (
          <Chip key={r.id} icon="layers" onClick={() => showEvidence(r.id)}>
            {l(r.question)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

const STATUS: Record<QView['status'], { icon: 'check' | 'clock' | 'shield' | 'block'; key: 'sch.answered' | 'sch.pending' | 'sch.st.held' | 'sch.st.assigned' | 'sch.st.rejected'; tone: string }> = {
  answered: { icon: 'check', key: 'sch.answered', tone: 'chip--emerald' },
  pending: { icon: 'clock', key: 'sch.pending', tone: 'chip--quiet' },
  queued: { icon: 'clock', key: 'sch.pending', tone: 'chip--quiet' },
  assigned: { icon: 'clock', key: 'sch.st.assigned', tone: 'chip--quiet' },
  held: { icon: 'shield', key: 'sch.st.held', tone: 'chip--demo' },
  rejected: { icon: 'block', key: 'sch.st.rejected', tone: 'chip--demo' },
};

function QuestionCard({ q, onWithdraw }: { q: QView; onWithdraw?: () => void }) {
  const { t, l, intl } = useI18n();
  const scholar = q.answer?.scholar;
  const date = (n: number) => new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric' }).format(n);
  const st = STATUS[q.status];
  const waiting = q.status === 'pending' || q.status === 'queued' || q.status === 'assigned' || q.status === 'held';
  return (
    <article className="card sch-q" data-status={q.status}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <span className={`chip ${st.tone}`}>
          <Icon name={st.icon} size={14} /> {t(st.key)}
        </span>
        <span className="t-small muted">{date(q.createdAt)}</span>
      </div>
      <p className="sch-q__text" dir="auto">{q.question}</p>
      {q.context && <p className="t-small muted" dir="auto">{q.context}</p>}
      {waiting && (
        <div className="sch-pending" role="status">
          <span className="star-breath" aria-hidden>
            <Star size={14} color="currentColor" />
          </span>
          <span className="t-small">{q.status === 'held' ? t('sch.held') : q.status === 'pending' ? t('sch.submittedOffline') : t('sch.submitted')}</span>
          {onWithdraw && q.status !== 'assigned' && (
            <Button size="sm" variant="ghost" onClick={onWithdraw}>
              {t('sch.withdraw')}
            </Button>
          )}
        </div>
      )}
      {q.status === 'rejected' && <p className="t-small muted">{t('sch.rejectedBody')}</p>}
      {q.answer && scholar && (
        <div className="sch-answer">
          <div className="sch-profile">
            <span className="sch-avatar" aria-hidden>
              {scholar.name
                .split(' ')
                .filter((w) => /^[A-Z]/.test(w))
                .slice(-2)
                .map((w) => w[0])
                .join('')}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row wrap" style={{ '--row-gap': '8px' } as React.CSSProperties}>
                <strong>{scholar.name}</strong>
                {scholar.verified ? <VerifiedBadge /> : <span className="chip chip--demo">{scholar.sample ? t('sch.sampleNotVerified') : t('sch.notVerified')}</span>}
              </div>
              <p className="t-small muted">
                {l(scholar.title)} · {l(scholar.specialization)}
              </p>
              {scholar.verified && scholar.scope && <p className="t-caption muted">{t('staff.scopeIs', { scope: scholar.scope })}</p>}
            </div>
          </div>
          <p className="sch-answer__text">{l(q.answer.text)}</p>
          <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties}>
            <span className="t-caption muted">{t('sch.sources')}</span>
            {q.answer.sources.map((s) => (
              <Chip key={s} tone="quiet">
                {s}
              </Chip>
            ))}
            <span className="spacer" />
            <span className="t-small muted">{date(q.answer.answeredAt)}</span>
          </div>
        </div>
      )}
    </article>
  );
}
