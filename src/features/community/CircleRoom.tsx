/**
 * A circle's room: chat that understands the journey, shared progress,
 * weekly goal, pinned guidance, challenge and resources — with moderation,
 * reporting and blocking built in. Encouragement over leaderboards.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CIRCLES, MEMBERS, REACTIONS, type ChatMessage, type Member } from '@/content/community';
import { MISSION_BY_ID } from '@/content/missions';
import { QUICK_REPLIES, type ModerationFlag } from '@/domain/safety';
import { Bar, Button, Chip, DemoNote, EmptyState, IconButton, Segmented, Sheet, StarLoader, Tile, toast, useIsDesktop } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import type { Report } from '@/store/community';
import { usePolicy, useProfile } from '@/store/profile';
import { useTutor } from '@/store/tutor';
import { detectMissionRefs, YOU } from '@/services/community';
import { useCircleChat, type CircleChat } from './live';
import { MessageButton } from './Messages';
import { Avatar } from '@/features/character/Character';
import { CircleCard } from './Circles';
import './community.css';

type Tab = 'chat' | 'overview' | 'members';

export default function CircleRoom() {
  const { id = '' } = useParams();
  const circle = CIRCLES.find((c) => c.id === id);
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const policy = usePolicy();
  const desktop = useIsDesktop();
  const chat = useCircleChat(id);
  const joined = chat.joined;
  const [tab, setTab] = useState<Tab>('chat');

  if (!circle || (policy.ageMatchedCirclesOnly && circle.ageBand !== policy.ageBand)) {
    return (
      <div className="page">
        <EmptyState icon="community" title={t('err.routeTitle')} action={<Button onClick={() => navigate('/circles')}>{t('com.title')}</Button>} />
      </div>
    );
  }

  return (
    <>
      <div className="night-backdrop" aria-hidden />
      <div className="room">
        <header className="room-head">
          <IconButton icon="back" label={t('a.back')} onClick={() => navigate('/circles')} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="room-title">{l(circle.name)}</h1>
            <p className="t-small muted">
              {l(circle.ageLabel)} · {t('com.members', { n: (chat.mode === 'live' ? chat.members.length : circle.memberIds.length) + (joined ? 1 : 0) })} · {MEMBERS[circle.mentorId].name}
            </p>
          </div>
          <Chip tone={chat.mode === 'live' ? 'emerald' : 'demo'}>{chat.mode === 'live' ? t('com.live') : t('state.demo')}</Chip>
          {circle.moderated && (
            <Chip tone="emerald" icon="shield" className="hide-mobile">
              {t('com.moderated')}
            </Chip>
          )}
        </header>

        {!desktop && (
          <div style={{ padding: '0 var(--gutter) 12px' }}>
            <Segmented label={l(circle.name)} value={tab} onChange={setTab} options={(['chat', 'overview', 'members'] as Tab[]).map((v) => ({ value: v, label: t(`com.tab.${v}`) }))} />
          </div>
        )}

        <div className="room-body">
          {(desktop || tab === 'chat') && <Chat chat={chat} />}
          {(desktop || tab !== 'chat') && (
            <aside className="room-side">
              {(desktop || tab === 'overview') && <Overview circleId={circle.id} />}
              {(desktop || tab === 'members') && <Members circleId={circle.id} chat={chat} />}
              {!joined && <CircleCard circle={circle} onJoined={chat.reload} />}
            </aside>
          )}
        </div>
      </div>
    </>
  );
}

const FLAG_KEYS: Record<ModerationFlag, `com.flag.${ModerationFlag}`> = {
  phone: 'com.flag.phone',
  email: 'com.flag.email',
  address: 'com.flag.address',
  link: 'com.flag.link',
  'contact-request': 'com.flag.contact-request',
  meetup: 'com.flag.meetup',
  handle: 'com.flag.handle',
  unkind: 'com.flag.unkind',
};

function Chat({ chat }: { chat: CircleChat }) {
  const { t, l, intl } = useI18n();
  const localPolicy = usePolicy();
  // Live: the server's policy for this person (guardian settings included) decides free text.
  const policy = { ...localPolicy, freeText: chat.freeText ?? localPolicy.freeText };
  const profile = useProfile((s) => s.profile)!;
  const joined = chat.joined;
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const list = chat.list;
  const pinned = list.find((m) => m.pinned);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight });
  }, [list.length]);

  const author = (id: string): Member | undefined => (id === YOU ? { id: YOU, name: t('com.you'), role: 'you', look: profile.look } : chat.author(id));
  const [sending, setSending] = useState(false);

  const submit = async (body: string, quick = false) => {
    if (sending) return;
    setSending(true);
    const res = await chat.send({ text: body, replyTo: replyTo?.id, quick });
    setSending(false);
    if (res.ok) {
      setText('');
      setReplyTo(null);
      setError(null);
      if (res.held) toast(t('com.held'));
    } else if (res.flags) {
      setError(t('com.blockedMsg', { reason: res.flags.map((f) => (FLAG_KEYS[f] ? t(FLAG_KEYS[f]) : f)).join(' ') }));
    } else if (res.reason === 'rate_limited') {
      setError(t('err.rate_limited'));
    } else if (res.reason === 'offline') {
      setError(t('err.offline'));
    } else if (res.message) {
      setError(res.message);
    }
  };

  if (chat.loading && chat.mode === 'live') {
    return (
      <section className="chat card card--flat">
        <StarLoader label={t('state.loading')} />
      </section>
    );
  }
  if (!joined) {
    return (
      <section className="chat card card--flat">
        <EmptyState icon="lock" title={t('com.notMember')} />
      </section>
    );
  }

  return (
    <section className="chat" aria-label={t('com.tab.chat')}>
      {pinned && (
        <div className="chat-pinned">
          <Icon name="pinned" size={16} />
          <span className="t-small">
            <strong>{t('com.pinned')}:</strong> <bdi>{pinned.text}</bdi>
          </span>
        </div>
      )}
      {(policy.ageBand === 'child' || policy.ageBand === 'teen') && (
        <p className="safety-note">
          <Icon name="shield" size={14} /> {policy.ageBand === 'child' ? t('com.noDMs') : t('com.noDMsTeen')}
        </p>
      )}

      <div className="chat-list" ref={listRef} role="log" aria-live="polite">
        {list.length === 0 && <EmptyState icon="community" title={t('com.emptyChat')} />}
        {list.map((m) => {
          const a = author(m.authorId);
          if (!a) return null;
          const mine = m.authorId === YOU;
          const quoted = m.replyTo ? chat.find(m.replyTo) : undefined;
          const refs = detectMissionRefs(m.text);
          return (
            <motion.article key={m.id} className="msg" data-mine={mine || undefined} data-held={m.status === 'held' || undefined} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {!mine && <Avatar look={a.look} size={34} gold={a.role === 'mentor'} />}
              <div className="msg__body">
                <div className="msg__head">
                  <strong>{a.name}</strong>
                  {a.role === 'mentor' && <span className="chip chip--gold msg__role">{t('com.mentor')}</span>}
                  <time className="t-small muted" dateTime={new Date(m.at).toISOString()}>
                    {new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit' }).format(m.at)}
                  </time>
                </div>
                {quoted && <p className="msg__quote" dir="auto">{quoted.text}</p>}
                <p className="msg__text" dir="auto">{m.text}</p>
                {refs.length > 0 && (
                  <div className="row wrap" style={{ '--row-gap': '6px', marginTop: 6 } as React.CSSProperties}>
                    {refs.map((r) => (
                      <MissionLink key={r.id} id={r.id} />
                    ))}
                  </div>
                )}
                {m.status === 'held' && (
                  <p className="msg__held">
                    <Icon name="clock" size={12} /> {t('com.held')}
                  </p>
                )}
                <div className="msg__reactions">
                  {REACTIONS.filter((r) => (m.reactions[r.key] ?? []).length > 0).map((r) => {
                    const who = m.reactions[r.key] ?? [];
                    return (
                      <button key={r.key} type="button" className="react" aria-pressed={who.includes(YOU)} aria-label={`${l(r.label)} · ${who.length}`} onClick={() => chat.react(m, r.key)}>
                        {r.emoji} {who.length}
                      </button>
                    );
                  })}
                  <button type="button" className="react react--add" aria-label={`${t('com.react')} / ${t('com.reply')}`} onClick={() => setMenuFor(m)}>
                    <Icon name="more" size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="composer">
        <div className="row wrap" style={{ '--row-gap': '6px' } as React.CSSProperties} aria-label={t('com.quickReplies')}>
          {QUICK_REPLIES.slice(0, policy.freeText ? 4 : QUICK_REPLIES.length).map((q) => (
            <button key={q.en} type="button" className="chip" disabled={sending} onClick={() => void submit(l(q), true)}>
              {l(q)}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {replyTo && (
            <motion.div className="composer__reply" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Icon name="reply" size={14} className="flip-rtl" /> {t('com.replyingTo', { name: author(replyTo.authorId)?.name ?? '' })}
              <span className="spacer" />
              <IconButton icon="close" size="sm" tone="plain" label={t('a.cancel')} onClick={() => setReplyTo(null)} />
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <p className="composer__error" role="alert">
            <Icon name="shield" size={14} /> {error}
          </p>
        )}
        {policy.freeText ? (
          <form
            className="input-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) void submit(text);
            }}
          >
            <label htmlFor="msg-in" className="sr-only">
              {t('com.messagePh')}
            </label>
            <input id="msg-in" className="input" value={text} maxLength={500} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder={t('com.messagePh')} />
            <IconButton icon="send" label={t('a.send')} type="submit" disabled={!text.trim() || sending} />
          </form>
        ) : (
          <p className="t-small muted">{t('com.quickOnly')}</p>
        )}
      </div>

      <MessageMenu
        chat={chat}
        msg={menuFor}
        onClose={() => setMenuFor(null)}
        onReply={(m) => {
          setReplyTo(m);
          setMenuFor(null);
          document.getElementById('msg-in')?.focus();
        }}
        onReport={(m) => {
          setMenuFor(null);
          setReportFor(m);
        }}
      />
      <ReportSheet chat={chat} msg={reportFor} onClose={() => setReportFor(null)} />
    </section>
  );
}

function MissionLink({ id }: { id: string }) {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const m = MISSION_BY_ID[id];
  return (
    <button type="button" className="chip chip--gold" onClick={() => navigate(`/mission/${id}`)}>
      <Icon name="play" size={14} /> {t('com.missionLink', { mission: `${t('m.number', { n: m.number })} · ${l(m.title)}` })}
    </button>
  );
}

function MessageMenu({ chat, msg, onClose, onReply, onReport }: { chat: CircleChat; msg: ChatMessage | null; onClose: () => void; onReply: (m: ChatMessage) => void; onReport: (m: ChatMessage) => void }) {
  const { t, l } = useI18n();
  const mine = msg?.authorId === YOU;
  const name = (msg && !mine ? chat.author(msg.authorId)?.name : '') ?? '';
  const isMentor = msg && chat.author(msg.authorId)?.role === 'mentor';
  return (
    <Sheet open={!!msg} onClose={onClose} title={t('com.react')} placement="bottom">
      {msg && (
        <div className="stack">
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            {REACTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className="react react--big"
                aria-pressed={(msg.reactions[r.key] ?? []).includes(YOU)}
                onClick={() => {
                  chat.react(msg, r.key);
                  onClose();
                }}
              >
                <span aria-hidden>{r.emoji}</span> {l(r.label)}
              </button>
            ))}
          </div>
          <Tile icon="reply" title={t('com.reply')} onClick={() => onReply(msg)} />
          {!mine && <Tile icon="flag" title={t('com.report')} onClick={() => onReport(msg)} />}
          {!mine && !isMentor && (
            <Tile
              icon="block"
              title={t('com.block', { name })}
              onClick={() => {
                chat.block(msg.authorId);
                toast(t('com.blocked', { name }), { action: { label: t('a.undo'), run: () => chat.unblock(msg.authorId) } });
                onClose();
              }}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}

function ReportSheet({ chat, msg, onClose }: { chat: CircleChat; msg: ChatMessage | null; onClose: () => void }) {
  const { t } = useI18n();
  const reasons: Report['reason'][] = ['unkind', 'unsafe', 'personal-info', 'wrong-info', 'other'];
  return (
    <Sheet open={!!msg} onClose={onClose} title={t('com.reportTitle')}>
      {msg && (
        <div className="stack">
          <p className="msg__quote" dir="auto">{msg.text}</p>
          {reasons.map((r) => (
            <Tile
              key={r}
              icon="flag"
              title={t(`com.reason.${r}`)}
              onClick={async () => {
                const ok = await chat.report(msg, r);
                toast(ok ? t('com.reportSent') : t('err.internal'));
                onClose();
              }}
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}

function Overview({ circleId }: { circleId: string }) {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const showEvidence = useTutor((s) => s.showEvidence);
  const circle = CIRCLES.find((c) => c.id === circleId)!;
  const ch = MISSION_BY_ID[circle.challenge.missionId];
  return (
    <div className="stack">
      <div className="card">
        <p className="t-caption muted card__eyebrow">{t('com.weeklyGoal')}</p>
        <p style={{ fontWeight: 700 }}>{l(circle.weeklyGoal.label)}</p>
        <div className="row" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <Bar value={circle.weeklyGoal.current / circle.weeklyGoal.target} gold label={l(circle.weeklyGoal.label)} />
          </div>
          <span className="gold" style={{ fontWeight: 800 }}>
            {circle.weeklyGoal.current}/{circle.weeklyGoal.target}
          </span>
        </div>
      </div>
      <div className="card">
        <p className="t-caption muted card__eyebrow">{t('com.challenge')}</p>
        <p style={{ fontWeight: 700 }}>{l(circle.challenge.title)}</p>
        <p className="t-small muted">
          {t('m.number', { n: ch.number })} · {l(ch.title)} · {t('com.challengeJoined', { n: circle.challenge.joined })}
        </p>
        <Button size="sm" style={{ marginTop: 10 }} icon="play" onClick={() => navigate(`/mission/${ch.id}`)}>
          {t('com.startChallenge')}
        </Button>
      </div>
      <div className="card card--flat">
        <p className="t-caption muted card__eyebrow">{t('com.resources')}</p>
        <ul className="list">
          {circle.resources.map((r) => (
            <li key={r.knowledgeId}>
              <button type="button" className="more-row" onClick={() => showEvidence(r.knowledgeId)}>
                <Icon name="layers" size={18} />
                <span style={{ flex: 1, textAlign: 'start' }}>{l(r.title)}</span>
                <Icon name="forward" size={16} className="flip-rtl muted" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <DemoNote>{t('com.sampleNote')}</DemoNote>
    </div>
  );
}

function Members({ circleId, chat }: { circleId: string; chat: CircleChat }) {
  const { t } = useI18n();
  const circle = CIRCLES.find((c) => c.id === circleId)!;
  const blocked = chat.blocked;
  const people: Member[] = chat.mode === 'live' ? chat.members : circle.memberIds.map((id) => MEMBERS[id]);
  return (
    <div className="card card--flat">
      <p className="t-caption muted card__eyebrow">{t('com.tab.members')}</p>
      <ul className="list">
        {people.map((m) => {
          const id = m.id;
          const isBlocked = blocked.includes(id);
          return (
            <li key={id} className="list-row">
              <Avatar look={m.look} size={34} gold={m.role === 'mentor'} />
              <span style={{ flex: 1 }}>
                {m.name} {m.role === 'mentor' && <span className="chip chip--gold msg__role">{t('com.mentor')}</span>}
                {chat.sampleIds.has(id) && <span className="chip chip--demo msg__role">{t('state.sample')}</span>}
              </span>
              {chat.mode === 'live' && !isBlocked && !chat.sampleIds.has(id) && <MessageButton userId={id} name={m.name} />}
              {isBlocked && (
                <Button size="sm" variant="ghost" onClick={() => chat.unblock(id)}>
                  {t('com.unblock')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
