/**
 * Staff console — moderation, content review, the scholar inbox and scholar
 * verification. Tabs are shown by role for convenience only: every action is
 * authorised again by the server, and refusals are shown as they come back.
 */
import { useState } from 'react';
import { Icon } from '@/brand/Icon';
import { Button, Chip, EmptyState, ErrorState, Field, Section, Segmented, StarLoader, TextArea, TextInput, toast } from '@/design-system';
import { Page } from '@/app/Page';
import { useI18n } from '@/i18n';
import { hasRole, useConnection, useRoles } from '@/store/connection';
import { api, ApiError } from '@/api/client';
import { Card, Reasoned, When } from './shared';
import { useAct, useLoad } from './hooks';
import { ContentStatus, KnowledgeStudio, MissionStudio, TextsStudio } from './ContentStudio';
import '@/features/missions/mission.css';
import './staff.css';

type Tab = 'moderation' | 'status' | 'knowledge' | 'missions' | 'texts' | 'inbox' | 'scholars' | 'users' | 'audit';

export default function Staff() {
  const { t } = useI18n();
  const status = useConnection((s) => s.status);
  const roles = useRoles();
  const tabs: { value: Tab; label: string }[] = [];
  if (hasRole(roles, 'moderator', 'admin')) tabs.push({ value: 'moderation', label: t('staff.tab.moderation') });
  if (hasRole(roles, 'moderator', 'admin', 'scholar')) {
    tabs.push({ value: 'status', label: t('cs.tab.status') });
    tabs.push({ value: 'knowledge', label: t('cs.knowledge') });
    tabs.push({ value: 'missions', label: t('cs.missions') });
    tabs.push({ value: 'texts', label: t('cs.textsTab') });
  }
  if (hasRole(roles, 'scholar')) tabs.push({ value: 'inbox', label: t('staff.tab.inbox') });
  if (hasRole(roles, 'admin')) tabs.push({ value: 'scholars', label: t('staff.tab.scholars') });
  if (hasRole(roles, 'admin')) tabs.push({ value: 'users', label: t('staff.tab.users') });
  if (hasRole(roles, 'moderator', 'admin')) tabs.push({ value: 'audit', label: t('staff.tab.audit') });
  const [tab, setTab] = useState<Tab | null>(null);
  const current = tab && tabs.some((x) => x.value === tab) ? tab : tabs[0]?.value;

  if (status !== 'online' || tabs.length === 0) {
    return (
      <Page eyebrow={t('staff.eyebrow')} title={t('staff.title')}>
        {status === 'connecting' ? <StarLoader label={t('state.loading')} /> : <EmptyState icon="lock" title={t('staff.noAccess')} body={t('staff.noAccessBody')} />}
      </Page>
    );
  }
  return (
    <Page eyebrow={t('staff.eyebrow')} title={t('staff.title')} sub={t('staff.sub')} wide>
      <div className="stack" style={{ gap: 20 }}>
        {tabs.length > 1 && (
          <div className="staff-tabs">
            <Segmented label={t('staff.title')} value={current!} onChange={setTab} options={tabs} />
          </div>
        )}
        {current === 'moderation' && <Moderation />}
        {current === 'status' && <ContentStatus />}
        {current === 'knowledge' && <KnowledgeStudio />}
        {current === 'missions' && <MissionStudio />}
        {current === 'texts' && <TextsStudio />}
        {current === 'inbox' && <ScholarInbox />}
        {current === 'scholars' && <Scholars />}
        {current === 'users' && <Users />}
        {current === 'audit' && <Audit />}
      </div>
    </Page>
  );
}

/* ── Moderation ──────────────────────────────────────────────── */

interface Queue {
  held: { id: string; circle_id: string; body: string; status: string; moderation: { categories?: string[] } | null; created_at: string; author: string | null }[];
  reports: { id: string; message_id: string; reason: string; note: string | null; created_at: string; body: string; status: string }[];
  questions: { id: string; question: string; topic: string; moderation: { categories?: string[] } | null; created_at: string }[];
  dms?: { id: string; body: string; status: string; moderation: { categories?: string[] } | null; created_at: string; reports: { reason: string }[] | null }[];
}

function Moderation() {
  const { t } = useI18n();
  const { data, error, load } = useLoad<Queue>('/moderation/queue');
  const act = useAct();
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  const msgActions = [
    { id: 'allow', label: t('staff.allow'), tone: 'emerald' as const },
    { id: 'hide', label: t('staff.hide') },
    { id: 'remove', label: t('staff.remove'), tone: 'danger' as const },
    { id: 'escalate', label: t('staff.escalate') },
  ];
  const onMsg = (id: string) => (action: string, reason: string) => act(() => api.post(`/moderation/messages/${id}`, { action, reason }), 'staff.done', load);
  const dms = data.dms ?? [];
  const empty = !data.held.length && !data.reports.length && !data.questions.length && !dms.length;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <p className="t-small muted">{t('staff.modIntro')}</p>
      {empty && <EmptyState icon="shield" title={t('staff.queueEmpty')} />}
      {data.held.length > 0 && (
        <Section title={t('staff.held')}>
          <ul className="staff-list">
            {data.held.map((m) => (
              <Card key={m.id}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Chip tone="demo">{m.status}</Chip>
                  {(m.moderation?.categories ?? []).map((c) => (
                    <Chip key={c} tone="quiet">
                      {c}
                    </Chip>
                  ))}
                  <span className="spacer" />
                  <When iso={m.created_at} />
                </div>
                <blockquote className="staff-quote" dir="auto">{m.body}</blockquote>
                <p className="t-caption muted">
                  {m.author ?? '—'} · {m.circle_id}
                </p>
                <Reasoned actions={msgActions} onAct={onMsg(m.id)} placeholder={t('staff.reason')} />
              </Card>
            ))}
          </ul>
        </Section>
      )}
      {data.reports.length > 0 && (
        <Section title={t('staff.reports')}>
          <ul className="staff-list">
            {data.reports.map((r) => (
              <Card key={r.id}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Chip tone="gold">{r.reason}</Chip>
                  <Chip tone="quiet">{r.status}</Chip>
                  <span className="spacer" />
                  <When iso={r.created_at} />
                </div>
                <blockquote className="staff-quote" dir="auto">{r.body}</blockquote>
                {r.note && <p className="t-small muted">{r.note}</p>}
                <Reasoned actions={msgActions} onAct={onMsg(r.message_id)} placeholder={t('staff.reason')} />
              </Card>
            ))}
          </ul>
        </Section>
      )}
      {dms.length > 0 && (
        <Section title={t('staff.dms')}>
          <p className="t-small muted">{t('staff.dmsIntro')}</p>
          <ul className="staff-list">
            {dms.map((m) => (
              <Card key={m.id}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Chip tone="demo">{m.status}</Chip>
                  {(m.moderation?.categories ?? []).map((c) => (
                    <Chip key={c} tone="quiet">
                      {c}
                    </Chip>
                  ))}
                  {(m.reports ?? []).map((r, i) => (
                    <Chip key={i} tone="gold">
                      {r.reason}
                    </Chip>
                  ))}
                  <span className="spacer" />
                  <When iso={m.created_at} />
                </div>
                <blockquote className="staff-quote" dir="auto">{m.body}</blockquote>
                <Reasoned
                  actions={[
                    { id: 'allow', label: t('staff.allow'), tone: 'emerald' },
                    { id: 'hide', label: t('staff.hide') },
                    { id: 'remove', label: t('staff.remove'), tone: 'danger' },
                    { id: 'escalate', label: t('staff.escalate') },
                  ]}
                  onAct={(action, reason) => act(() => api.post(`/moderation/dm/${m.id}`, { action, reason }), 'staff.done', load)}
                  placeholder={t('staff.reason')}
                />
              </Card>
            ))}
          </ul>
        </Section>
      )}
      {data.questions.length > 0 && (
        <Section title={t('staff.heldQuestions')}>
          <ul className="staff-list">
            {data.questions.map((q) => (
              <Card key={q.id}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Chip tone="quiet">{q.topic}</Chip>
                  {(q.moderation?.categories ?? []).map((c) => (
                    <Chip key={c} tone="demo">
                      {c}
                    </Chip>
                  ))}
                  <span className="spacer" />
                  <When iso={q.created_at} />
                </div>
                <blockquote className="staff-quote" dir="auto">{q.question}</blockquote>
                <Reasoned
                  actions={[
                    { id: 'release', label: t('staff.release'), tone: 'emerald' },
                    { id: 'reject', label: t('staff.reject'), tone: 'danger' },
                  ]}
                  onAct={(action, reason) => act(() => api.post(`/moderation/questions/${q.id}`, { action, reason }), 'staff.done', load)}
                  placeholder={t('staff.reason')}
                />
              </Card>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/* ── Scholar inbox ───────────────────────────────────────────── */

interface InboxQ {
  id: string;
  question: string;
  context: string | null;
  topic: string;
  status: 'queued' | 'assigned';
  source: 'learner' | 'amanah' | 'nour';
  created_at: string;
}

function ScholarInbox() {
  const { t } = useI18n();
  const { data, error, load } = useLoad<{ questions: InboxQ[] }>('/scholar/inbox');
  const act = useAct();
  if (error) return <EmptyState icon="lock" title={t('staff.notVerified')} body={error} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  if (!data.questions.length) return <EmptyState icon="scholar" title={t('staff.inboxEmpty')} />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="t-small muted">{t('staff.inboxIntro')}</p>
      <ul className="staff-list">
        {data.questions.map((q) => (
          <Card key={q.id}>
            <div className="row wrap" style={{ gap: 8 }}>
              <Chip tone="quiet">{q.topic}</Chip>
              {q.source !== 'learner' && <Chip tone="gold">{q.source.toUpperCase()}</Chip>}
              <Chip tone={q.status === 'assigned' ? 'emerald' : 'quiet'}>{t(q.status === 'assigned' ? 'staff.yours' : 'staff.open')}</Chip>
              <span className="spacer" />
              <When iso={q.created_at} />
            </div>
            <blockquote className="staff-quote" dir="auto">{q.question}</blockquote>
            {q.context && <p className="t-small muted">{q.context}</p>}
            {q.status === 'queued' ? (
              <Button size="sm" variant="emerald" icon="hand" onClick={() => act(() => api.post(`/scholar/questions/${q.id}/claim`), 'staff.claimed', load)}>
                {t('staff.claim')}
              </Button>
            ) : (
              <AnswerForm id={q.id} onDone={load} />
            )}
          </Card>
        ))}
      </ul>
    </div>
  );
}

function AnswerForm({ id, onDone }: { id: string; onDone: () => void }) {
  const { t } = useI18n();
  const act = useAct();
  const [en, setEn] = useState('');
  const [ar, setAr] = useState('');
  const [sources, setSources] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void act(
          () => api.post(`/scholar/questions/${id}/answer`, { body: { en, ar }, sources: sources.split('\n').map((s) => s.trim()).filter(Boolean) }),
          'staff.answered',
          onDone,
        );
      }}
    >
      <Field label={t('staff.answerEn')} htmlFor={`en-${id}`}>
        <TextArea id={`en-${id}`} rows={4} value={en} onChange={(e) => setEn(e.target.value)} maxLength={6000} />
      </Field>
      <Field label={t('staff.answerAr')} htmlFor={`ar-${id}`}>
        <TextArea id={`ar-${id}`} rows={4} dir="rtl" lang="ar" value={ar} onChange={(e) => setAr(e.target.value)} maxLength={6000} />
      </Field>
      <Field label={t('staff.sources')} hint={t('staff.sourcesHint')} htmlFor={`src-${id}`}>
        <TextArea id={`src-${id}`} rows={3} value={sources} onChange={(e) => setSources(e.target.value)} />
      </Field>
      <Button type="submit" variant="emerald" disabled={!en.trim() && !ar.trim()}>
        {t('staff.publishAnswer')}
      </Button>
    </form>
  );
}

/* ── Scholar verification (admin) ────────────────────────────── */

interface AdminScholar {
  profile: { id: string; name: string; verification: 'unverified' | 'pending' | 'verified' | 'suspended' | 'sample'; scope: string | null; verifiedAt: string | null; isDemo: boolean; languages: string[] };
  credentials: { type: string; issuer: string; year?: number; reference?: string }[];
  email: string | null;
}

function Scholars() {
  const { t } = useI18n();
  const { data, error, load } = useLoad<{ scholars: AdminScholar[] }>('/admin/scholars');
  const act = useAct();
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <p className="t-small muted">{t('staff.verifyIntro')}</p>
      <ul className="staff-list">
        {data.scholars.map((s) => (
          <Card key={s.profile.id}>
            <div className="row wrap" style={{ gap: 8 }}>
              <strong>{s.profile.name}</strong>
              {s.email && <span className="t-small muted">{s.email}</span>}
              <Chip tone={s.profile.verification === 'verified' ? 'emerald' : s.profile.verification === 'suspended' || s.profile.verification === 'sample' ? 'demo' : 'quiet'}>{t(`cs.sv.${s.profile.verification}`)}</Chip>
            </div>
            {s.profile.scope && <p className="t-small">{t('staff.scopeIs', { scope: s.profile.scope })}</p>}
            {s.credentials.length > 0 && (
              <ul className="t-small muted" style={{ margin: 0, paddingInlineStart: 18 }}>
                {s.credentials.map((c, i) => (
                  <li key={i}>
                    {c.type} — {c.issuer}
                    {c.year ? ` (${c.year})` : ''}
                    {c.reference ? ` · ${c.reference}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {s.profile.isDemo ? (
              <p className="t-caption muted">{t('staff.sampleNever')}</p>
            ) : (
              <Reasoned
                actions={[
                  // Verifying needs recorded credentials (checked outside SAJA); the server refuses otherwise.
                  ...(s.credentials.length ? [{ id: 'verified', label: t('staff.verify'), tone: 'emerald' as const }] : []),
                  { id: 'pending', label: t('staff.v.pending') },
                  { id: 'suspended', label: t('staff.suspend'), tone: 'danger' },
                ]}
                onAct={(status, scope) => act(() => api.post(`/admin/scholars/${s.profile.id}/verification`, { status, scope }), 'staff.done', load)}
                placeholder={t('staff.verifyScope')}
              />
            )}
          </Card>
        ))}
      </ul>
      <AddScholar onDone={load} />
    </div>
  );
}

function AddScholar({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const act = useAct();
  const [f, setF] = useState({ email: '', name: '', titleEn: '', titleAr: '', specEn: '', specAr: '', languages: '', credType: '', credIssuer: '', credYear: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Section title={t('staff.addScholar')}>
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void act(
            () =>
              api.post('/admin/scholars', {
                email: f.email.trim(),
                displayName: f.name.trim(),
                title: { en: f.titleEn, ar: f.titleAr },
                specialization: { en: f.specEn, ar: f.specAr },
                languages: f.languages.split(',').map((s) => s.trim()).filter(Boolean),
                credentials: f.credType ? [{ type: f.credType, issuer: f.credIssuer, year: f.credYear ? Number(f.credYear) : undefined }] : [],
              }),
            'staff.added',
            onDone,
          );
        }}
      >
        <p className="t-small muted">{t('staff.addIntro')}</p>
        <div className="staff-grid">
          <Field label={t('acc.email')} htmlFor="as-email">
            <TextInput id="as-email" type="email" required value={f.email} onChange={set('email')} />
          </Field>
          <Field label={t('staff.displayName')} htmlFor="as-name">
            <TextInput id="as-name" required value={f.name} onChange={set('name')} />
          </Field>
          <Field label={t('staff.titleEn')} htmlFor="as-te">
            <TextInput id="as-te" value={f.titleEn} onChange={set('titleEn')} />
          </Field>
          <Field label={t('staff.titleAr')} htmlFor="as-ta">
            <TextInput id="as-ta" dir="rtl" value={f.titleAr} onChange={set('titleAr')} />
          </Field>
          <Field label={t('staff.specEn')} htmlFor="as-se">
            <TextInput id="as-se" value={f.specEn} onChange={set('specEn')} />
          </Field>
          <Field label={t('staff.specAr')} htmlFor="as-sa">
            <TextInput id="as-sa" dir="rtl" value={f.specAr} onChange={set('specAr')} />
          </Field>
          <Field label={t('staff.languages')} htmlFor="as-l">
            <TextInput id="as-l" value={f.languages} onChange={set('languages')} placeholder="Arabic, English" />
          </Field>
          <Field label={t('staff.credential')} htmlFor="as-ct">
            <TextInput id="as-ct" value={f.credType} onChange={set('credType')} placeholder="Ijazah" />
          </Field>
          <Field label={t('staff.issuer')} htmlFor="as-ci">
            <TextInput id="as-ci" value={f.credIssuer} onChange={set('credIssuer')} />
          </Field>
          <Field label={t('staff.year')} htmlFor="as-cy">
            <TextInput id="as-cy" inputMode="numeric" value={f.credYear} onChange={set('credYear')} />
          </Field>
        </div>
        <p className="t-caption muted">
          <Icon name="info" size={14} /> {t('staff.addNote')}
        </p>
        <Button type="submit" disabled={!f.email || f.name.length < 2}>
          {t('staff.addCta')}
        </Button>
      </form>
    </Section>
  );
}

/* ── Document preview (staff sees the version under review, with provenance) ── */

/* ── Users (admin) ───────────────────────────────────────────── */

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  declared_band: string | null;
  approved_band: string | null;
  guardian_consent: string | null;
  roles: string[];
}
const GRANTABLE = ['moderator', 'mentor', 'scholar', 'admin'] as const;

function Users() {
  const { t } = useI18n();
  const act = useAct();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const search = async () => {
    if (q.trim().length < 3) return;
    try {
      setUsers((await api.get<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q.trim())}`)).users);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t('err.internal'));
    }
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="t-small muted">{t('staff.usersIntro')}</p>
      <form
        className="staff-actions"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('staff.searchEmail')} aria-label={t('staff.searchEmail')} />
        <Button type="submit" size="sm" disabled={q.trim().length < 3}>
          {t('a.search')}
        </Button>
      </form>
      {users && users.length === 0 && <p className="muted">{t('staff.noUsers')}</p>}
      <ul className="staff-list">
        {users?.map((u) => (
          <Card key={u.id}>
            <div className="row wrap" style={{ gap: 8 }}>
              <strong style={{ overflowWrap: 'anywhere' }}>{u.email}</strong>
              {u.roles.map((r) => (
                <Chip key={r} tone={r === 'learner' ? 'quiet' : 'gold'}>
                  {t(`role.${r as 'learner'}`)}
                </Chip>
              ))}
              <span className="spacer" />
              <When iso={u.created_at} />
            </div>
            <p className="t-small muted">
              {t('acc.ageDeclared')}: {u.declared_band ?? '—'} · {t('acc.ageApproved')}: {u.approved_band ?? '—'} · {t('acc.consent')}: {u.guardian_consent ?? '—'}
            </p>
            <Reasoned
              actions={GRANTABLE.map((r) => ({ id: r, label: u.roles.includes(r) ? t('staff.revokeRole', { role: t(`role.${r}`) }) : t('staff.grantRole', { role: t(`role.${r}`) }), tone: u.roles.includes(r) ? ('danger' as const) : ('secondary' as const) }))}
              onAct={(role, reason) => act(() => api.post(`/admin/users/${u.id}/roles`, { role, grant: !u.roles.includes(role), reason }), 'staff.done', () => void search())}
              placeholder={t('staff.reason')}
            />
          </Card>
        ))}
      </ul>
    </div>
  );
}

/* ── Audit trail ─────────────────────────────────────────────── */

function Audit() {
  const { t } = useI18n();
  const { data, error, load } = useLoad<{ entries: { kind: string; target_type: string; target_id: string; action: string; actor_kind: string; detail: string | null; categories: string[] | null; created_at: string }[] }>('/admin/audit?limit=150');
  if (error) return <ErrorState body={error} onRetry={load} />;
  if (!data) return <StarLoader label={t('state.loading')} />;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="t-small muted">{t('staff.auditIntro')}</p>
      <ul className="staff-list">
        {data.entries.map((e, i) => (
          <li key={i} className="audit-row">
            <When iso={e.created_at} />
            <Chip tone={e.kind === 'content-review' ? 'emerald' : e.kind === 'scholar-workflow' ? 'gold' : 'quiet'}>{t(`staff.kind.${e.kind as 'moderation'}`)}</Chip>
            <span className="t-small">
              <strong>{e.action}</strong> · {e.target_type} <code className="t-caption">{e.target_id.slice(0, 18)}</code> · {['system', 'human', 'scholar'].includes(e.actor_kind) ? t(`staff.actor.${e.actor_kind as 'system'}`) : e.actor_kind.replace('_', ' ')}
            </span>
            {(e.detail || e.categories?.length) && <span className="t-small muted">{[e.detail, ...(e.categories ?? [])].filter(Boolean).join(' · ')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
