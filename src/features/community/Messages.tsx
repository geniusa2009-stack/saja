/**
 * Private messages — adults with accounts only. Everything here is enforced by
 * the server (age, account, shared circle, blocks, moderation); this screen only
 * shows the states the server returns: requested, active, declined, closed.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/brand/Icon';
import { Button, Dialog, EmptyState, IconButton, Section, StarLoader, Tile, toast } from '@/design-system';
import { Page } from '@/app/Page';
import { useI18n } from '@/i18n';
import { useConnection } from '@/store/connection';
import { api, ApiError } from '@/api/client';
import { onServerEvent } from '@/api/sync';
import { Avatar } from '@/features/character/Character';
import type { CharacterLook } from '@/domain/types';
import './community.css';

interface Thread {
  id: string;
  status: 'requested' | 'active';
  requested_by_me: boolean;
  other_id: string;
  other_name: string;
  other_look: CharacterLook | null;
  last: { body: string; mine: boolean; at: string } | null;
}
interface Msg {
  id: string;
  mine: boolean;
  body: string;
  status: 'visible' | 'held';
  created_at: string;
}

const REASONS = ['unkind', 'unsafe', 'personal-info', 'other'] as const;

function useDmAllowed() {
  const me = useConnection((s) => s.me);
  const online = useConnection((s) => s.status === 'online');
  if (!online) return 'offline' as const;
  // Age first: a child or teen should hear "adults only", never "make an account".
  if (me && me.user.ageBand !== 'adult') return 'age' as const;
  if (!me || me.user.isGuest) return 'account' as const;
  return 'ok' as const;
}

export default function Messages() {
  const { t } = useI18n();
  const { id } = useParams();
  const allowed = useDmAllowed();
  if (allowed !== 'ok') {
    return (
      <Page eyebrow={t('nav.community')} title={t('dm.title')}>
        <EmptyState icon="lock" title={t(`dm.no.${allowed}`)} body={allowed === 'age' ? t('dm.ageBody') : undefined} />
      </Page>
    );
  }
  return id ? <ThreadView id={id} /> : <ThreadList />;
}

function ThreadList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const load = useCallback(async () => {
    try {
      setThreads((await api.get<{ threads: Thread[] }>('/dm')).threads);
    } catch {
      setThreads([]);
    }
  }, []);
  useEffect(() => {
    void load();
    const off1 = onServerEvent('dm.thread', () => void load());
    const off2 = onServerEvent('dm.message', () => void load());
    return () => {
      off1();
      off2();
    };
  }, [load]);
  const respond = async (th: Thread, accept: boolean) => {
    try {
      await api.post(`/dm/${th.id}/respond`, { accept });
      if (accept) navigate(`/messages/${th.id}`);
      else void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t('err.internal'));
    }
  };
  const incoming = threads?.filter((x) => x.status === 'requested' && !x.requested_by_me) ?? [];
  const rest = threads?.filter((x) => !(x.status === 'requested' && !x.requested_by_me)) ?? [];
  return (
    <Page eyebrow={t('nav.community')} title={t('dm.title')} sub={t('dm.sub')}>
      {!threads ? (
        <StarLoader label={t('state.loading')} />
      ) : threads.length === 0 ? (
        <EmptyState icon="community" title={t('dm.empty')} body={t('dm.emptyBody')} />
      ) : (
        <div className="stack" style={{ gap: 24 }}>
          {incoming.length > 0 && (
            <Section title={t('dm.requests')}>
              <ul className="list">
                {incoming.map((th) => (
                  <li key={th.id} className="list-row" style={{ gap: 10 }}>
                    {th.other_look && <Avatar look={th.other_look} size={34} />}
                    <span style={{ flex: 1 }}>{t('dm.wantsToTalk', { name: th.other_name })}</span>
                    <Button size="sm" variant="emerald" onClick={() => void respond(th, true)}>
                      {t('dm.accept')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void respond(th, false)}>
                      {t('dm.decline')}
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title={t('dm.conversations')}>
            <ul className="list">
              {rest.map((th) => (
                <li key={th.id}>
                  <button type="button" className="more-row" onClick={() => navigate(`/messages/${th.id}`)}>
                    {th.other_look && <Avatar look={th.other_look} size={34} />}
                    <span style={{ display: 'grid', gap: 2, flex: 1, textAlign: 'start', minWidth: 0 }}>
                      <strong>{th.other_name}</strong>
                      <span className="t-small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {th.status === 'requested' ? t('dm.waiting') : th.last ? `${th.last.mine ? `${t('com.you')}: ` : ''}${th.last.body}` : t('dm.noMessages')}
                      </span>
                    </span>
                    <Icon name="forward" size={16} className="flip-rtl muted" />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
      <p className="t-small muted" style={{ marginTop: 24 }}>
        <Icon name="shield" size={14} /> {t('dm.safety')}
      </p>
    </Page>
  );
}

function ThreadView({ id }: { id: string }) {
  const { t, intl } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<{ messages: Msg[]; status: string; requestedByMe: boolean } | null>(null);
  const [other, setOther] = useState<Thread | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<Msg | null>(null);
  const [confirm, setConfirm] = useState<'block' | 'close' | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const [m, th] = await Promise.all([api.get<{ messages: Msg[]; status: string; requestedByMe: boolean }>(`/dm/${id}/messages`), api.get<{ threads: Thread[] }>('/dm')]);
      setData(m);
      setOther(th.threads.find((x) => x.id === id) ?? null);
    } catch {
      setData({ messages: [], status: 'closed', requestedByMe: false });
    }
  }, [id]);
  useEffect(() => {
    void load();
    const off1 = onServerEvent('dm.message', (e) => (e as { threadId: string }).threadId === id && void load());
    const off2 = onServerEvent('dm.thread', (e) => (e as { threadId: string }).threadId === id && void load());
    return () => {
      off1();
      off2();
    };
  }, [id, load]);
  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight });
  }, [data?.messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    try {
      const r = await api.post<{ status: string }>(`/dm/${id}/messages`, { body });
      setText('');
      if (r.status === 'held') toast(t('com.held'));
      void load();
    } catch (e) {
      setError(e instanceof ApiError ? (e.code === 'policy_blocked' ? t('err.policy_blocked') : e.code === 'rate_limited' ? t('err.rate_limited') : e.message) : t('err.internal'));
    }
  };

  if (!data) return <StarLoader label={t('state.loading')} />;
  const open = data.status === 'active';
  return (
    <>
      <div className="night-backdrop" aria-hidden />
      <div className="room">
        <header className="room-head">
          <IconButton icon="back" label={t('a.back')} onClick={() => navigate('/messages')} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="room-title">{other?.other_name ?? t('dm.title')}</h1>
            <p className="t-small muted">{open ? t('dm.private') : data.status === 'requested' ? t('dm.waiting') : t('dm.closed')}</p>
          </div>
          {other && (
            <>
              <IconButton icon="block" label={t('com.block', { name: other.other_name })} onClick={() => setConfirm('block')} />
              <IconButton icon="close" label={t('dm.close')} onClick={() => setConfirm('close')} />
            </>
          )}
        </header>
        <section className="chat" style={{ margin: '0 var(--gutter)' }} aria-label={t('dm.title')}>
          <div className="chat-list" ref={listRef} role="log" aria-live="polite">
            {data.messages.length === 0 && <EmptyState icon="community" title={t('dm.noMessages')} />}
            {data.messages.map((m) => (
              <article key={m.id} className="msg" data-mine={m.mine || undefined} data-held={m.status === 'held' || undefined}>
                <div className="msg__body">
                  <div className="msg__head">
                    <strong>{m.mine ? t('com.you') : other?.other_name}</strong>
                    <time className="t-small muted" dateTime={m.created_at}>
                      {new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit' }).format(new Date(m.created_at))}
                    </time>
                  </div>
                  <p className="msg__text" dir="auto">{m.body}</p>
                  {m.status === 'held' && (
                    <p className="msg__held">
                      <Icon name="clock" size={12} /> {t('com.held')}
                    </p>
                  )}
                  {!m.mine && (
                    <div className="msg__reactions">
                      <button type="button" className="react react--add" aria-label={t('com.report')} onClick={() => setMenuFor(m)}>
                        <Icon name="flag" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {open ? (
            <div className="composer">
              {error && (
                <p className="composer__error" role="alert">
                  <Icon name="shield" size={14} /> {error}
                </p>
              )}
              <form
                className="input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label htmlFor="dm-in" className="sr-only">
                  {t('dm.placeholder')}
                </label>
                <input id="dm-in" className="input" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={t('dm.placeholder')} />
                <IconButton icon="send" label={t('a.send')} type="submit" disabled={!text.trim()} />
              </form>
            </div>
          ) : (
            <p className="t-small muted" style={{ padding: 12 }}>
              {data.status === 'requested' ? (data.requestedByMe ? t('dm.waitingThem') : t('dm.acceptFirst')) : t('dm.closedBody')}
            </p>
          )}
        </section>
      </div>

      <Dialog open={!!menuFor} onClose={() => setMenuFor(null)} title={t('com.reportTitle')}>
        <div className="stack">
          {REASONS.map((r) => (
            <Tile
              key={r}
              icon="flag"
              title={t(`com.reason.${r}`)}
              onClick={async () => {
                if (!menuFor) return;
                try {
                  await api.post(`/dm/${id}/messages/${menuFor.id}/report`, { reason: r });
                  toast(t('com.reportSent'));
                  void load();
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : t('err.internal'));
                }
                setMenuFor(null);
              }}
            />
          ))}
        </div>
      </Dialog>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'block' ? t('com.block', { name: other?.other_name ?? '' }) : t('dm.close')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t('a.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  if (confirm === 'block' && other) await api.post(`/blocks/${other.other_id}`);
                  else await api.post(`/dm/${id}/close`);
                  navigate('/messages');
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : t('err.internal'));
                }
                setConfirm(null);
              }}
            >
              {confirm === 'block' ? t('dm.blockConfirm') : t('dm.closeConfirm')}
            </Button>
          </>
        }
      >
        <p>{confirm === 'block' ? t('dm.blockBody') : t('dm.closeBody')}</p>
      </Dialog>
    </>
  );
}

/** "Message" button next to a circle member — adults with accounts only, and the server still decides. */
export function MessageButton({ userId, name }: { userId: string; name: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const allowed = useDmAllowed();
  if (allowed !== 'ok') return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      icon="send"
      aria-label={t('dm.messageName', { name })}
      onClick={async () => {
        try {
          const r = await api.post<{ threadId: string }>('/dm/request', { userId });
          toast(t('dm.requestSent'));
          navigate(`/messages/${r.threadId}`);
        } catch (e) {
          toast(e instanceof ApiError ? e.message : t('err.internal'));
        }
      }}
    >
      {t('dm.message')}
    </Button>
  );
}
