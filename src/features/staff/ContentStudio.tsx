/**
 * Content studio — the staff side of religious content:
 *   status dashboard · knowledge editor · mission review · texts that live in code.
 *
 * Every state shown here comes from the server. Buttons are offered by role for
 * convenience only; the server authorises every edit and review step again
 * (verified scholars approve, never their own version; only admins publish).
 */
import { Suspense, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Chip, EmptyState, ErrorState, Field, Section, Segmented, StarLoader, TextArea, TextInput } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { hasRole, useRoles } from '@/store/connection';
import { api } from '@/api/client';
import type { L10n } from '@/domain/types';
import type { MissionDefinition } from '@/domain/missionDefinitions';
import type { HadithSnapshot } from '@/domain/hadith';
import { MISSION_BY_ID } from '@/content/missions';
import { MECHANICS } from '@/features/missions/registry';
import { MissionPayloadProvider } from '@/features/missions/payload';
import { useProfile } from '@/store/profile';
import { Card, Reasoned, When } from './shared';
import { useAct, useLoad } from './hooks';

export type ReviewStatus = 'draft' | 'internal_review' | 'scholar_review' | 'approved' | 'published' | 'archived';
const STATUSES: ReviewStatus[] = ['draft', 'internal_review', 'scholar_review', 'approved', 'published', 'archived'];

interface Review {
  version: number;
  fromStatus: string;
  toStatus: string;
  reviewerRole: string;
  scope: string;
  note: string | null;
  at: string;
  scholar: { name: string; verification: string } | null;
}

/* ── Small pieces ────────────────────────────────────────────── */

/** English and Arabic side by side — reviewers check both. */
function Bi({ value, strong }: { value: L10n | undefined | null; strong?: boolean }) {
  if (!value) return null;
  const Tag = strong ? 'strong' : 'span';
  return (
    <div className="cs-bi">
      <Tag lang="en" dir="ltr">
        {value.en}
      </Tag>
      <Tag lang="ar" dir="rtl">
        {value.ar}
      </Tag>
    </div>
  );
}

function StateChips({ status, current, live, demo }: { status: ReviewStatus; current: number; live: number | null; demo: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <Chip tone="quiet">v{current}</Chip>
      <Chip tone={status === 'published' ? 'emerald' : status === 'approved' ? 'gold' : 'demo'}>{t(`staff.rs.${status}`)}</Chip>
      {live ? <Chip tone="emerald">{t('staff.liveVersion', { v: live })}</Chip> : demo ? <Chip tone="demo">{t('cs.servedDemo')}</Chip> : <Chip tone="quiet">{t('cs.notServed')}</Chip>}
    </>
  );
}

function Trail({ reviews }: { reviews: Review[] }) {
  const { t } = useI18n();
  if (!reviews.length) return <p className="t-small muted">{t('cs.noReviews')}</p>;
  return (
    <ol className="cs-trail">
      {reviews.map((r, i) => (
        <li key={i}>
          <span className="t-caption">
            v{r.version} · {r.fromStatus === '-' ? '' : `${t(`staff.rs.${r.fromStatus as ReviewStatus}`)} → `}
            <strong>{t(`staff.rs.${r.toStatus as ReviewStatus}`)}</strong>
          </span>
          <span className="t-small muted">
            {t(`cs.role.${r.reviewerRole}` as TKey)}
            {r.scholar && ` · ${r.scholar.name} (${t(`cs.sv.${r.scholar.verification}` as TKey)})`} · {r.scope}
            {r.note ? ` · ${r.note}` : ''}
          </span>
          <When iso={r.at} />
        </li>
      ))}
    </ol>
  );
}

function Steps({ next, onAct }: { next: ReviewStatus[]; onAct: (to: ReviewStatus, scope: string) => void }) {
  const { t } = useI18n();
  if (!next.length) return null;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="t-caption muted">{t('cs.stepsHint')}</span>
      <Reasoned
        actions={next.map((to) => ({ id: to, label: `→ ${t(`staff.rs.${to}`)}`, tone: to === 'draft' || to === 'archived' ? 'secondary' : 'emerald' }))}
        onAct={(to, scope) => onAct(to as ReviewStatus, scope)}
        placeholder={t('staff.scope')}
      />
    </div>
  );
}

function Filter({ value, onChange, counts }: { value: ReviewStatus | 'all'; onChange: (v: ReviewStatus | 'all') => void; counts: Record<string, number> }) {
  const { t } = useI18n();
  return (
    <div className="row wrap" style={{ gap: 6 }} role="group" aria-label={t('cs.filter')}>
      {(['all', ...STATUSES] as const).map((s) => (
        <Chip key={s} pressed={value === s} onClick={() => onChange(s)} tone={value === s ? 'gold' : 'quiet'}>
          {t(`staff.rs.${s}`)} {s !== 'all' && `· ${counts[s] ?? 0}`}
        </Chip>
      ))}
    </div>
  );
}

const countBy = <T,>(rows: T[], key: (r: T) => string) => rows.reduce<Record<string, number>>((acc, r) => ((acc[key(r)] = (acc[key(r)] ?? 0) + 1), acc), {});

/* ── Status dashboard ────────────────────────────────────────── */

interface Counts {
  total: number;
  byStatus: Record<ReviewStatus, number>;
  served: { published: number; demo: number; hidden: number };
}
interface StatusData {
  knowledge: Counts;
  missions: Counts;
  dailyDeen: { total: number; published: number; demo: number; hidden: number };
  claimRules: Counts & { usedBy: string[] };
  conceptStories: Counts;
  quizzes: Counts;
  hadith: Counts;
  scholars: Record<'unverified' | 'pending' | 'verified' | 'suspended' | 'sample', number>;
  scholarAnswers: { sample: number; real: number };
}

function StatusCard({ title, sub, c }: { title: string; sub?: string; c: Counts }) {
  const { t } = useI18n();
  return (
    <li className="card cs-stat">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{title}</strong>
        <span className="t-h3">{c.total}</span>
      </div>
      {sub && <span className="t-caption muted">{sub}</span>}
      <dl className="cs-served">
        <div>
          <dt>{t('cs.published')}</dt>
          <dd className={c.served.published ? 'emerald' : undefined}>{c.served.published}</dd>
        </div>
        <div>
          <dt>{t('cs.demo')}</dt>
          <dd>{c.served.demo}</dd>
        </div>
        <div>
          <dt>{t('cs.hidden')}</dt>
          <dd>{c.served.hidden}</dd>
        </div>
      </dl>
      <div className="row wrap" style={{ gap: 4 }}>
        {STATUSES.filter((s) => c.byStatus[s]).map((s) => (
          <Chip key={s} tone="quiet">
            {t(`staff.rs.${s}`)} · {c.byStatus[s]}
          </Chip>
        ))}
      </div>
    </li>
  );
}

export function ContentStatus() {
  const { t } = useI18n();
  const { data, error, load } = useLoad<StatusData>('/content/status');
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  const d = data.dailyDeen;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <p className="t-small muted">{t('cs.statusIntro')}</p>
      <ul className="staff-grid cs-grid">
        <StatusCard title={t('cs.knowledge')} c={data.knowledge} />
        <StatusCard title={t('cs.missions')} c={data.missions} />
        <li className="card cs-stat">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{t('cs.daily')}</strong>
            <span className="t-h3">{d.total}</span>
          </div>
          <span className="t-caption muted">{t('cs.dailySub')}</span>
          <dl className="cs-served">
            <div>
              <dt>{t('cs.published')}</dt>
              <dd className={d.published ? 'emerald' : undefined}>{d.published}</dd>
            </div>
            <div>
              <dt>{t('cs.demo')}</dt>
              <dd>{d.demo}</dd>
            </div>
            <div>
              <dt>{t('cs.hidden')}</dt>
              <dd>{d.hidden}</dd>
            </div>
          </dl>
        </li>
        <StatusCard title={t('cs.rules')} sub={t('cs.rulesSub')} c={data.claimRules} />
        <StatusCard title={t('cs.stories')} sub={t('cs.codeSub')} c={data.conceptStories} />
        <StatusCard title={t('cs.quizzes')} sub={t('cs.codeSub')} c={data.quizzes} />
        <StatusCard title={t('cs.hadith')} sub={t('cs.hadithSub')} c={data.hadith} />
        <li className="card cs-stat">
          <strong>{t('cs.scholars')}</strong>
          <dl className="cs-served cs-served--5">
            {(['verified', 'pending', 'unverified', 'suspended', 'sample'] as const).map((s) => (
              <div key={s}>
                <dt>{t(`cs.sv.${s}`)}</dt>
                <dd className={s === 'verified' && data.scholars[s] ? 'emerald' : undefined}>{data.scholars[s]}</dd>
              </div>
            ))}
          </dl>
          <span className="t-caption muted">{t('cs.answers', { real: data.scholarAnswers.real, sample: data.scholarAnswers.sample })}</span>
        </li>
      </ul>
    </div>
  );
}

/* ── Knowledge editor ────────────────────────────────────────── */

interface DocRow {
  id: string;
  review_status: ReviewStatus;
  current_version: number;
  published_version: number | null;
  demo_version: number | null;
  served_version: number | null;
  is_demo: boolean;
  updated_at: string;
  question: L10n;
}
type Evidence = { kind: 'quran' | 'hadith' | 'scholarly'; ref: string; text: L10n; rendering: 'translation' | 'meaning'; translationName?: string; arabic?: string };
const SECTIONS = ['question', 'simple', 'deep', 'example', 'why', 'context', 'uncertainty'] as const;
type Section = (typeof SECTIONS)[number];
interface DocView {
  id: string;
  version: number;
  status: 'demo' | 'published' | 'in-review';
  reviewStatus: ReviewStatus;
  confidence: 'consensus' | 'majority' | 'difference' | 'review';
  topics: string[];
  content: Partial<Record<Section, L10n>> & { keywords?: string[] };
  evidence: (Evidence & { sourceId?: string | null })[];
  provenance: { origin?: string; basedOnVersion?: number | null; editorRole?: string; importedFrom?: string; note?: string };
  changeNote: string | null;
}

export function KnowledgeStudio() {
  const { t } = useI18n();
  const roles = useRoles();
  const canWrite = hasRole(roles, 'admin', 'scholar');
  const { data, error, load } = useLoad<{ documents: DocRow[] }>('/knowledge/review/queue');
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  if (creating) return <KnowledgeForm onDone={() => (setCreating(false), void load())} onCancel={() => setCreating(false)} />;
  if (open) return <KnowledgeDetail id={open} onBack={() => (setOpen(null), void load())} canWrite={canWrite} />;
  const docs = data.documents.filter((d) => filter === 'all' || d.review_status === filter);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row wrap" style={{ gap: 12, justifyContent: 'space-between' }}>
        <p className="t-small muted" style={{ flex: '1 1 320px', margin: 0 }}>
          {t('staff.contentIntro')}
        </p>
        {canWrite && (
          <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
            {t('cs.newDoc')}
          </Button>
        )}
      </div>
      <Filter value={filter} onChange={setFilter} counts={countBy(data.documents, (d) => d.review_status)} />
      <ul className="staff-list">
        {docs.map((d) => (
          <Card key={d.id}>
            <div className="row wrap" style={{ gap: 8 }}>
              <strong>{d.id}</strong>
              <StateChips status={d.review_status} current={d.current_version} live={d.published_version} demo={d.demo_version != null} />
              <span className="spacer" />
              <When iso={d.updated_at} />
            </div>
            <Bi value={d.question} />
            <div>
              <Button size="sm" variant="secondary" iconEnd="forward" onClick={() => setOpen(d.id)}>
                {t('cs.open')}
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}

function KnowledgeDetail({ id, onBack, canWrite }: { id: string; onBack: () => void; canWrite: boolean }) {
  const { t } = useI18n();
  const act = useAct();
  const doc = useLoad<DocView>(`/knowledge/${id}?as=staff`);
  const trail = useLoad<{ status: ReviewStatus; next: ReviewStatus[]; reviews: Review[] }>(`/knowledge/${id}/reviews`);
  const history = useLoad<{ versions: { version: number; change_note: string | null; created_at: string; provenance: DocView['provenance']; published: boolean }[] }>(`/knowledge/${id}/versions`);
  const [editing, setEditing] = useState(false);
  const reload = () => (void doc.load(), void trail.load(), void history.load());
  if (doc.error) return <ErrorState body={doc.error} onRetry={doc.load} />;
  if (!doc.data || !trail.data) return <StarLoader label={t('state.loading')} />;
  const d = doc.data;
  if (editing) return <KnowledgeForm initial={d} onDone={() => (setEditing(false), reload())} onCancel={() => setEditing(false)} />;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <BackRow onBack={onBack} title={d.id}>
        <Chip tone="quiet">v{d.version}</Chip>
        <Chip tone={d.status === 'published' ? 'emerald' : 'demo'}>{t(`cs.vs.${d.status}`)}</Chip>
        <Chip tone="quiet">{t(`staff.rs.${trail.data.status}`)}</Chip>
      </BackRow>
      <Section title={t('staff.preview')}>
        <div className="card stack cs-preview" style={{ gap: 12 }}>
          <Bi value={d.content.question} strong />
          {SECTIONS.slice(1).map((s) =>
            d.content[s] ? (
              <div key={s} className="stack" style={{ gap: 4 }}>
                <span className="t-caption gold">{t(`cs.sec.${s}`)}</span>
                <Bi value={d.content[s]} />
              </div>
            ) : null,
          )}
          <div className="stack" style={{ gap: 6 }}>
            <span className="t-caption gold">{t('staff.sources')}</span>
            {d.evidence.map((e, i) => (
              <div key={i} className="cs-evidence">
                <strong>
                  {e.ref} · {t(`cs.ev.${e.kind}`)} · {t(`cs.rend.${e.rendering}`)}
                </strong>
                <Bi value={e.text} />
              </div>
            ))}
          </div>
          <span className="t-caption muted">
            {t('cs.provenance')}: {d.provenance.origin ?? '—'}
            {d.provenance.basedOnVersion ? ` · ${t('cs.basedOn', { v: d.provenance.basedOnVersion })}` : ''}
            {d.changeNote ? ` · ${d.changeNote}` : ''}
          </span>
        </div>
      </Section>
      {canWrite && (
        <div>
          <Button size="sm" icon="edit" variant="secondary" onClick={() => setEditing(true)}>
            {t('cs.editDraft')}
          </Button>
        </div>
      )}
      <Section title={t('cs.review')}>
        <div className="stack" style={{ gap: 12 }}>
          <Trail reviews={trail.data.reviews} />
          <Steps next={trail.data.next} onAct={(to, scope) => act(() => api.post(`/knowledge/${id}/review`, { to, scope }), 'staff.done', reload)} />
        </div>
      </Section>
      {history.data && (
        <Section title={t('cs.history')}>
          <ol className="cs-trail">
            {history.data.versions.map((v) => (
              <li key={v.version}>
                <span className="t-caption">
                  <strong>v{v.version}</strong> · {v.provenance?.origin ?? '—'} {v.published && <Chip tone="emerald">{t('cs.wasPublished')}</Chip>}
                </span>
                <span className="t-small muted">{v.change_note ?? '—'}</span>
                <When iso={v.created_at} />
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

function BackRow({ onBack, title, children }: { onBack: () => void; title: string; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      <Button size="sm" variant="ghost" icon="back" onClick={onBack}>
        {t('a.back')}
      </Button>
      <strong className="t-h3" style={{ overflowWrap: 'anywhere' }}>
        {title}
      </strong>
      {children}
    </div>
  );
}

const emptyL = (): L10n => ({ en: '', ar: '' });

function LField({ id, label, value, onChange, rows = 2, required }: { id: string; label: string; value: L10n; onChange: (v: L10n) => void; rows?: number; required?: boolean }) {
  const { t } = useI18n();
  return (
    <fieldset className="cs-lfield">
      <legend className="t-small">{label}</legend>
      <Field label={t('cs.en')} htmlFor={`${id}-en`}>
        <TextArea id={`${id}-en`} lang="en" dir="ltr" rows={rows} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} maxLength={4000} required={required} />
      </Field>
      <Field label={t('cs.ar')} htmlFor={`${id}-ar`}>
        <TextArea id={`${id}-ar`} lang="ar" dir="rtl" rows={rows} value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} maxLength={4000} required={required} />
      </Field>
    </fieldset>
  );
}

function KnowledgeForm({ initial, onDone, onCancel }: { initial?: DocView; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const act = useAct();
  const [newId, setNewId] = useState('k-');
  const [topics, setTopics] = useState(initial?.topics.join(', ') ?? '');
  const [content, setContent] = useState<Record<Section, L10n>>(() => Object.fromEntries(SECTIONS.map((s) => [s, initial?.content[s] ?? emptyL()])) as Record<Section, L10n>);
  const [keywords, setKeywords] = useState(initial?.content.keywords?.join(', ') ?? '');
  const [confidence, setConfidence] = useState<DocView['confidence']>(initial?.confidence ?? 'review');
  const [evidence, setEvidence] = useState<Evidence[]>(() => initial?.evidence.map(({ sourceId: _s, ...e }) => e) ?? [{ kind: 'quran', ref: '', text: emptyL(), rendering: 'meaning' }]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const setEv = (i: number, patch: Partial<Evidence>) => setEvidence((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { uncertainty, ...rest } = content;
    const payload = {
      content: { ...rest, ...(uncertainty.en.trim() && uncertainty.ar.trim() ? { uncertainty } : {}), keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) },
      evidence: evidence.map((ev) => ({ ...ev, translationName: ev.translationName || undefined, arabic: ev.arabic || undefined })),
      confidence,
      changeNote: note.trim(),
    };
    await act(
      () => (initial ? api.post(`/knowledge/${initial.id}/versions`, payload) : api.post('/knowledge', { ...payload, id: newId.trim(), topics: topics.split(',').map((x) => x.trim()).filter(Boolean) })),
      'cs.saved',
      onDone,
    );
    setBusy(false);
  };
  return (
    <form className="stack cs-form" style={{ gap: 16 }} onSubmit={submit}>
      <BackRow onBack={onCancel} title={initial ? t('cs.editing', { id: initial.id }) : t('cs.newDoc')} />
      <p className="t-small muted">{t('cs.draftNote')}</p>
      {!initial && (
        <div className="staff-grid">
          <Field label={t('cs.docId')} hint={t('cs.docIdHint')} htmlFor="cs-id">
            <TextInput id="cs-id" value={newId} onChange={(e) => setNewId(e.target.value)} pattern="k-[a-z0-9-]{2,40}" required />
          </Field>
          <Field label={t('cs.topics')} hint={t('cs.commaHint')} htmlFor="cs-topics">
            <TextInput id="cs-topics" value={topics} onChange={(e) => setTopics(e.target.value)} required />
          </Field>
        </div>
      )}
      {SECTIONS.map((s) => (
        <LField key={s} id={`cs-${s}`} label={t(`cs.sec.${s}`)} value={content[s]} rows={s === 'question' ? 1 : s === 'deep' ? 4 : 2} onChange={(v) => setContent((c) => ({ ...c, [s]: v }))} required={s !== 'uncertainty'} />
      ))}
      <Field label={t('cs.keywords')} hint={t('cs.commaHint')} htmlFor="cs-kw">
        <TextInput id="cs-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </Field>
      <div className="stack" style={{ gap: 6 }}>
        <span className="t-small">{t('cs.confidence')}</span>
        <Segmented label={t('cs.confidence')} value={confidence} onChange={setConfidence} options={(['consensus', 'majority', 'difference', 'review'] as const).map((v) => ({ value: v, label: t(`ev.conf.${v}`) }))} />
      </div>
      <Section title={t('staff.sources')}>
        <div className="stack" style={{ gap: 12 }}>
          {evidence.map((ev, i) => (
            <fieldset key={i} className="cs-lfield">
              <legend className="t-small">
                {t('cs.source')} {i + 1}
              </legend>
              <div className="row wrap" style={{ gap: 8 }}>
                <Segmented label={t('cs.kind')} value={ev.kind} onChange={(kind) => setEv(i, { kind })} options={(['quran', 'hadith', 'scholarly'] as const).map((v) => ({ value: v, label: t(`cs.ev.${v}`) }))} />
                <Segmented label={t('cs.rendering')} value={ev.rendering} onChange={(rendering) => setEv(i, { rendering })} options={(['translation', 'meaning'] as const).map((v) => ({ value: v, label: t(`cs.rend.${v}`) }))} />
              </div>
              <Field label={t('cs.ref')} htmlFor={`ev-ref-${i}`}>
                <TextInput id={`ev-ref-${i}`} value={ev.ref} onChange={(e) => setEv(i, { ref: e.target.value })} required minLength={2} maxLength={120} />
              </Field>
              <LField id={`ev-text-${i}`} label={t('cs.sourceText')} value={ev.text} onChange={(text) => setEv(i, { text })} required />
              {evidence.length > 1 && (
                <Button size="sm" variant="ghost" icon="close" onClick={() => setEvidence((l) => l.filter((_, j) => j !== i))}>
                  {t('cs.removeSource')}
                </Button>
              )}
            </fieldset>
          ))}
          {evidence.length < 12 && (
            <div>
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setEvidence((l) => [...l, { kind: 'quran', ref: '', text: emptyL(), rendering: 'meaning' }])}>
                {t('cs.addSource')}
              </Button>
            </div>
          )}
        </div>
      </Section>
      <Field label={t('cs.changeNote')} hint={t('cs.changeNoteHint')} htmlFor="cs-note">
        <TextInput id="cs-note" value={note} onChange={(e) => setNote(e.target.value)} minLength={3} maxLength={500} required />
      </Field>
      <div className="row wrap" style={{ gap: 8 }}>
        <Button type="submit" variant="emerald" disabled={busy || note.trim().length < 3}>
          {t('cs.saveDraft')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('a.cancel')}
        </Button>
      </div>
    </form>
  );
}

/* ── Mission review ──────────────────────────────────────────── */

interface MissionRow {
  id: string;
  number: number;
  review_status: ReviewStatus;
  current_version: number;
  published_version: number | null;
  demo_version: number | null;
  is_demo: boolean;
  updated_at: string;
  title: L10n;
  interaction_type: string;
}

export function MissionStudio() {
  const { t } = useI18n();
  const roles = useRoles();
  const { data, error, load } = useLoad<{ missions: MissionRow[] }>('/missions/review/queue');
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  if (open) return <MissionDetail id={open} onBack={() => (setOpen(null), void load())} canWrite={hasRole(roles, 'admin', 'scholar')} />;
  const rows = data.missions.filter((m) => filter === 'all' || m.review_status === filter);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="t-small muted">{t('cs.missionsIntro')}</p>
      <Filter value={filter} onChange={setFilter} counts={countBy(data.missions, (m) => m.review_status)} />
      <ul className="staff-list">
        {rows.map((m) => (
          <Card key={m.id}>
            <div className="row wrap" style={{ gap: 8 }}>
              <strong>
                {t('m.number', { n: m.number })} · {m.id}
              </strong>
              <StateChips status={m.review_status} current={m.current_version} live={m.published_version} demo={m.demo_version != null} />
              <Chip tone="quiet">{m.interaction_type}</Chip>
              <span className="spacer" />
              <When iso={m.updated_at} />
            </div>
            <Bi value={m.title} />
            <div>
              <Button size="sm" variant="secondary" iconEnd="forward" onClick={() => setOpen(m.id)}>
                {t('cs.open')}
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}

type MissionView = MissionDefinition & { status: 'demo' | 'published' | 'in-review'; reviewStatus: ReviewStatus; provenance: { origin?: string; basedOnVersion?: number | null }; changeNote: string | null };

function MissionDetail({ id, onBack, canWrite }: { id: string; onBack: () => void; canWrite: boolean }) {
  const { t } = useI18n();
  const act = useAct();
  const def = useLoad<MissionView>(`/missions/${id}?as=staff`);
  const texts = useLoad<{ version: number; texts: { path: string; en: string; ar: string }[] }>(`/missions/${id}/texts`);
  const history = useLoad<{ status: ReviewStatus; next: ReviewStatus[]; versions: { version: number; change_note: string | null; created_at: string; provenance: { origin?: string } }[]; reviews: Review[] }>(`/missions/${id}/history`);
  const [view, setView] = useState<'preview' | 'texts' | 'history'>('preview');
  const reload = () => (void def.load(), void texts.load(), void history.load());
  if (def.error) return <ErrorState body={def.error} onRetry={def.load} />;
  if (!def.data || !texts.data || !history.data) return <StarLoader label={t('state.loading')} />;
  const d = def.data;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <BackRow onBack={onBack} title={`${t('m.number', { n: d.number })} · ${d.title.en}`}>
        <Chip tone="quiet">v{d.version}</Chip>
        <Chip tone={d.status === 'published' ? 'emerald' : 'demo'}>{t(`cs.vs.${d.status}`)}</Chip>
        <Chip tone="quiet">{t(`staff.rs.${history.data.status}`)}</Chip>
      </BackRow>
      <Segmented
        label={t('cs.missions')}
        value={view}
        onChange={setView}
        options={[
          { value: 'preview', label: t('staff.preview') },
          { value: 'texts', label: t('cs.texts') },
          { value: 'history', label: t('cs.history') },
        ]}
      />
      {view === 'preview' && <MissionPreview def={d} />}
      {view === 'texts' && <MissionTexts id={id} texts={texts.data.texts} version={texts.data.version} canWrite={canWrite} onSaved={reload} />}
      {view === 'history' && (
        <ol className="cs-trail">
          {history.data.versions.map((v) => (
            <li key={v.version}>
              <span className="t-caption">
                <strong>v{v.version}</strong> · {v.provenance?.origin ?? '—'}
              </span>
              <span className="t-small muted">{v.change_note ?? '—'}</span>
              <When iso={v.created_at} />
            </li>
          ))}
        </ol>
      )}
      <Section title={t('cs.review')}>
        <div className="stack" style={{ gap: 12 }}>
          <Trail reviews={history.data.reviews} />
          <Steps next={history.data.next} onAct={(to, scope) => act(() => api.post(`/missions/${id}/review`, { to, scope }), 'staff.done', reload)} />
        </div>
      </Section>
    </div>
  );
}

/** Plays the version under review with the real mechanic. Nothing is recorded. */
function MissionPreview({ def }: { def: MissionView }) {
  const { t, l } = useI18n();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState<L10n | null>(null);
  const traveller = useProfile((s) => s.profile);
  const base = MISSION_BY_ID[def.id];
  const Played = MECHANICS[def.interactionType];
  if (!base || !Played) return <EmptyState icon="compass" title={t('cs.noPreview')} />;
  // Mechanics draw the player's own traveller; a staff device without one can't preview.
  if (!traveller) return <EmptyState icon="compass" title={t('cs.noPreview')} body={t('cs.noTraveller')} />;
  const mission = { ...base, title: def.title, summary: def.summary };
  return (
    <div className="card stack cs-mission-preview" style={{ gap: 12 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="t-caption muted">{t('cs.previewNote', { v: def.version })}</span>
        <span className="spacer" />
        <span className="t-caption">{Math.round(progress * 100)}%</span>
        <Button size="sm" variant="ghost" icon="refresh" onClick={() => (setRun((r) => r + 1), setDone(false), setProgress(0), setHint(null))}>
          {t('cs.restart')}
        </Button>
      </div>
      <Bi value={def.summary} />
      {hint && <p className="t-small gold">{l(hint)}</p>}
      {done ? (
        <EmptyState icon="check" title={t('cs.previewDone')} body={t('cs.previewNothingSaved')} />
      ) : (
        <div className="mission-play cs-stage" key={run}>
          <MissionPayloadProvider value={def.payload}>
            <Suspense fallback={<StarLoader label={t('m.loading')} />}>
              <Played mission={mission} guided={false} onStep={() => undefined} setHint={setHint} setProgress={setProgress} onComplete={() => setDone(true)} />
            </Suspense>
          </MissionPayloadProvider>
        </div>
      )}
    </div>
  );
}

const pathLabel = (p: string) => p.replace(/^payload\./, '').replace(/\.(\d+)\./g, ' $1 · ').replace(/\./g, ' · ');

function MissionTexts({ id, texts, version, canWrite, onSaved }: { id: string; texts: { path: string; en: string; ar: string }[]; version: number; canWrite: boolean; onSaved: () => void }) {
  const { t } = useI18n();
  const act = useAct();
  const [edits, setEdits] = useState<Record<string, L10n>>({});
  const [note, setNote] = useState('');
  const changed = Object.entries(edits).filter(([p, v]) => {
    const o = texts.find((x) => x.path === p);
    return o && (o.en !== v.en || o.ar !== v.ar);
  });
  return (
    <form
      className="stack cs-form"
      style={{ gap: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        void act(() => api.post(`/missions/${id}/draft`, { texts: changed.map(([path, v]) => ({ path, ...v })), changeNote: note.trim() }), 'cs.saved', () => (setEdits({}), setNote(''), onSaved()));
      }}
    >
      <p className="t-small muted">{t(canWrite ? 'cs.textsNote' : 'cs.textsReadOnly', { v: version })}</p>
      {texts.map((x) =>
        canWrite ? (
          <LField key={x.path} id={`mt-${x.path}`} label={pathLabel(x.path)} value={edits[x.path] ?? { en: x.en, ar: x.ar }} onChange={(v) => setEdits((all) => ({ ...all, [x.path]: v }))} required />
        ) : (
          <div key={x.path} className="stack" style={{ gap: 4 }}>
            <span className="t-caption gold">{pathLabel(x.path)}</span>
            <Bi value={x} />
          </div>
        ),
      )}
      {canWrite && (
        <div className="cs-savebar">
          <Field label={t('cs.changeNote')} htmlFor={`mt-note-${id}`}>
            <TextInput id={`mt-note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} minLength={3} maxLength={500} required />
          </Field>
          <Button type="submit" variant="emerald" disabled={!changed.length || note.trim().length < 3}>
            {t('cs.saveTexts', { n: changed.length })}
          </Button>
        </div>
      )}
    </form>
  );
}

/* ── Texts that live in code ─────────────────────────────────── */

type BlockKind = 'claim_rule' | 'concept_story' | 'quiz' | 'hadith';
interface Block {
  kind: BlockKind;
  id: string;
  current_version: number;
  published_version: number | null;
  review_status: ReviewStatus;
  is_demo: boolean;
  updated_at: string;
  next: ReviewStatus[];
  content: {
    verdict?: string;
    explanation?: L10n;
    suggestion?: L10n | null;
    patterns?: string[];
    pages?: L10n[];
    q?: L10n;
    options?: { label: L10n; correct: boolean; why: L10n }[];
    record?: HadithSnapshot;
  };
}

export function TextsStudio() {
  const { t } = useI18n();
  const act = useAct();
  const { data, error, load } = useLoad<{ blocks: Block[] }>('/content/blocks');
  const [kind, setKind] = useState<BlockKind>('claim_rule');
  const [open, setOpen] = useState<string | null>(null);
  const [trail, setTrail] = useState<Review[] | null>(null);
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  const rows = data.blocks.filter((b) => b.kind === kind);
  const toggle = async (b: Block) => {
    const key = `${b.kind}:${b.id}`;
    setTrail(null);
    setOpen(open === key ? null : key);
    if (open !== key) setTrail((await api.get<{ reviews: Review[] }>(`/content/blocks/${b.kind}/${b.id}/reviews`).catch(() => ({ reviews: [] }))).reviews);
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="t-small muted">{t('cs.textsIntro')}</p>
      <Segmented
        label={t('cs.textsTab')}
        value={kind}
        onChange={(k) => (setKind(k), setOpen(null))}
        options={(['claim_rule', 'concept_story', 'quiz', 'hadith'] as const).map((k) => ({ value: k, label: `${t(`cs.kind.${k}`)} · ${data.blocks.filter((b) => b.kind === k).length}` }))}
      />
      <ul className="staff-list">
        {rows.map((b) => {
          const key = `${b.kind}:${b.id}`;
          return (
            <Card key={key}>
              <div className="row wrap" style={{ gap: 8 }}>
                <strong>{b.id}</strong>
                <StateChips status={b.review_status} current={b.current_version} live={b.published_version} demo={!b.published_version} />
                {b.content.verdict && <Chip tone="quiet">{b.content.verdict}</Chip>}
                <span className="spacer" />
                <When iso={b.updated_at} />
              </div>
              <BlockBody b={b} />
              <div>
                <Button size="sm" variant="ghost" icon="eye" aria-expanded={open === key} onClick={() => void toggle(b)}>
                  {t('cs.review')}
                </Button>
              </div>
              {open === key && (
                <div className="stack" style={{ gap: 10 }}>
                  {trail ? <Trail reviews={trail} /> : <StarLoader />}
                  <Steps next={b.next} onAct={(to, scope) => act(() => api.post(`/content/blocks/${b.kind}/${b.id}/review`, { to, scope }), 'staff.done', () => (setOpen(null), void load()))} />
                </div>
              )}
            </Card>
          );
        })}
      </ul>
    </div>
  );
}

function BlockBody({ b }: { b: Block }) {
  const { t } = useI18n();
  const c = b.content;
  if (b.kind === 'claim_rule')
    return (
      <div className="stack" style={{ gap: 6 }}>
        <Bi value={c.explanation} />
        {c.suggestion && (
          <>
            <span className="t-caption gold">{t('cs.suggestion')}</span>
            <Bi value={c.suggestion} />
          </>
        )}
        <details>
          <summary className="t-caption">{t('cs.patterns', { n: c.patterns?.length ?? 0 })}</summary>
          <code className="cs-patterns" dir="ltr">
            {c.patterns?.join('\n')}
          </code>
        </details>
      </div>
    );
  if (b.kind === 'concept_story')
    return (
      <ol className="cs-pages">
        {c.pages?.map((p, i) => (
          <li key={i}>
            <Bi value={p} />
          </li>
        ))}
      </ol>
    );
  if (b.kind === 'hadith') {
    const r = c.record;
    if (!r) return <p className="t-small muted">{t('cs.noPreview')}</p>;
    return (
      <div className="stack" style={{ gap: 8 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="chip chip--quiet" dir="ltr">
            {r.source.reference}
          </span>
          <Chip tone="quiet">{t('hadith.detail.gradingLabel')}: {r.grading.label.en} / {r.grading.label.ar}</Chip>
        </div>
        <p className="arabic-text" dir="rtl" lang="ar" style={{ margin: 0 }}>
          {r.arabic}
        </p>
        <Bi value={r.title} strong />
        <Bi value={r.meaning} />
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Bi value={c.q} strong />
      <ul className="cs-pages">
        {c.options?.map((o, i) => (
          <li key={i}>
            <span className={o.correct ? 'emerald' : 'muted'}>{o.correct ? '✓ ' : '○ '}</span>
            <Bi value={o.label} />
            <span className="t-small muted">
              <Bi value={o.why} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
