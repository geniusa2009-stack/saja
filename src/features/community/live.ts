/**
 * One interface for a circle's conversation, two sources:
 *  - live: the SAJA server (membership, moderation, reports and blocks enforced there; realtime over SSE)
 *  - demo: the on-device sample circle (offline), with the same client-side safety rules
 * The chat UI renders either without knowing which — but it shows which one it is.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MEMBERS, type ChatMessage, type Member } from '@/content/community';
import type { ModerationFlag } from '@/domain/safety';
import { useCommunity, type Report } from '@/store/community';
import { useConnection } from '@/store/connection';
import { useProfile } from '@/store/profile';
import { visibleMessages, YOU } from '@/services/community';
import { api, ApiError } from '@/api/client';
import { onServerEvent, reconnectStream } from '@/api/sync';
import type { CharacterLook, L10n } from '@/domain/types';

export type SendOutcome = { ok: true; held: boolean } | { ok: false; flags?: ModerationFlag[]; reason?: string; message?: string };

export interface CircleChat {
  mode: 'live' | 'demo';
  loading: boolean;
  joined: boolean;
  list: ChatMessage[];
  find: (id: string) => ChatMessage | undefined;
  author: (id: string) => Member | undefined;
  members: Member[];
  /** Live members that are sample personas (demo data) — never messageable. */
  sampleIds: Set<string>;
  blocked: string[];
  freeText?: boolean;
  send: (a: { text: string; replyTo?: string; quick: boolean }) => Promise<SendOutcome>;
  react: (m: ChatMessage, key: string) => void;
  report: (m: ChatMessage, reason: Report['reason']) => Promise<boolean>;
  block: (authorId: string) => void;
  unblock: (authorId: string) => void;
  reload: () => void;
}

interface ServerMsg {
  id: string;
  circleId: string;
  author: { id: string; name: string; look: CharacterLook | null; role: 'member' | 'mentor' | 'moderator'; isYou: boolean };
  body: string;
  replyTo: string | null;
  status: 'visible' | 'held' | 'hidden' | 'removed';
  pinned: boolean;
  createdAt: string;
  reactions: Record<string, number>;
  mine: string[];
}

interface ServerCircle {
  id: string;
  members: { id: string; name: string; look: CharacterLook | null; role: string; isYou: boolean; isSample?: boolean }[];
  membership: string | null;
  policy: { freeText: boolean };
}

const DEFAULT_LOOK: CharacterLook = { skin: 2, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 0, accessory: 'none' };

/** Server counts → the list-of-ids shape the chat renders (only length and "includes you" are read). */
function toChat(m: ServerMsg): ChatMessage {
  const reactions: Record<string, string[]> = {};
  for (const [k, n] of Object.entries(m.reactions ?? {})) {
    const mine = m.mine?.includes(k);
    reactions[k] = [...(mine ? [YOU] : []), ...Array.from({ length: Math.max(0, n - (mine ? 1 : 0)) }, (_, i) => `other-${i}`)];
  }
  return {
    id: m.id,
    circleId: m.circleId,
    authorId: m.author.isYou ? YOU : m.author.id,
    text: m.body,
    at: Date.parse(m.createdAt),
    replyTo: m.replyTo ?? undefined,
    reactions,
    status: m.status === 'held' ? 'held' : m.status === 'visible' ? 'sent' : 'removed',
    pinned: m.pinned,
  };
}

const roleOf = (r: string): Member['role'] => (r === 'mentor' || r === 'moderator' ? 'mentor' : 'member');

export function useCircleChat(circleId: string): CircleChat {
  const live = useConnection((s) => s.status === 'online' && !!s.me);
  const demo = useDemoChat(circleId);
  const server = useLiveChat(circleId, live);
  return live ? server : demo;
}

function useDemoChat(circleId: string): CircleChat {
  const profile = useProfile((s) => s.profile);
  const messages = useCommunity((s) => s.messages);
  const blocked = useCommunity((s) => s.blocked);
  const reports = useCommunity((s) => s.reports);
  const joined = useCommunity((s) => s.joined.includes(circleId));
  const list = useMemo(() => {
    const reported = new Set(reports.map((r) => r.messageId));
    return visibleMessages(messages, circleId, blocked).filter((m) => !reported.has(m.id));
  }, [messages, circleId, blocked, reports]);
  return {
    mode: 'demo',
    loading: false,
    joined,
    list,
    find: (id) => messages.find((m) => m.id === id),
    author: (id) => (id === YOU && profile ? { id: YOU, name: '', role: 'you', look: profile.look } : MEMBERS[id]),
    members: [],
    sampleIds: new Set(),
    blocked,
    send: async ({ text, replyTo, quick }) => {
      const res = useCommunity.getState().send({ circleId, text, replyTo, isQuickReply: quick });
      if (res.ok) return { ok: true, held: res.message.status === 'held' };
      return res.reason === 'blocked' ? { ok: false, flags: res.flags } : { ok: false, reason: res.reason };
    },
    react: (m, key) => {
      const cur = m.reactions[key] ?? [];
      useCommunity.getState().update({ ...m, reactions: { ...m.reactions, [key]: cur.includes(YOU) ? cur.filter((x) => x !== YOU) : [...cur, YOU] } });
    },
    report: async (m, reason) => {
      useCommunity.getState().report({ messageId: m.id, reason });
      return true;
    },
    block: (id) => useCommunity.getState().block(id),
    unblock: (id) => useCommunity.getState().unblock(id),
    reload: () => undefined,
  };
}

function useLiveChat(circleId: string, enabled: boolean): CircleChat {
  const profile = useProfile((s) => s.profile);
  const [info, setInfo] = useState<ServerCircle | null>(null);
  const [msgs, setMsgs] = useState<ServerMsg[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const authors = useRef(new Map<string, Member>());

  const remember = useCallback((m: ServerMsg) => {
    if (!m.author.isYou) authors.current.set(m.author.id, { id: m.author.id, name: m.author.name, role: roleOf(m.author.role), look: m.author.look ?? DEFAULT_LOOK });
  }, []);

  const load = useCallback(async () => {
    try {
      const ci = await api.get<ServerCircle>(`/circles/${circleId}`);
      setInfo(ci);
      for (const mb of ci.members) if (!mb.isYou) authors.current.set(mb.id, { id: mb.id, name: mb.name, role: roleOf(mb.role), look: mb.look ?? DEFAULT_LOOK });
      if (ci.membership) {
        const r = await api.get<{ messages: ServerMsg[] }>(`/circles/${circleId}/messages`);
        r.messages.forEach(remember);
        setMsgs(r.messages);
        void api.post(`/circles/${circleId}/read`).catch(() => undefined);
      }
      const b = await api.get<{ blocked: { id: string }[] }>('/blocks');
      setBlocked(b.blocked.map((x) => x.id));
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [circleId, remember]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const offMsg = onServerEvent('chat.message', (e) => {
      const { circleId: cid, message } = e as { circleId: string; message: ServerMsg };
      if (cid !== circleId) return;
      remember(message);
      setMsgs((cur) => (cur.some((x) => x.id === message.id) ? cur.map((x) => (x.id === message.id ? { ...message, author: { ...message.author, isYou: x.author.isYou } } : x)) : [...cur, message]));
    });
    const offUpd = onServerEvent('chat.update', (e) => {
      const { circleId: cid, message } = e as { circleId: string; message: { id: string; reactions: Record<string, number> } };
      if (cid === circleId) setMsgs((cur) => cur.map((x) => (x.id === message.id ? { ...x, reactions: message.reactions } : x)));
    });
    return () => {
      offMsg();
      offUpd();
    };
  }, [enabled, circleId, load, remember]);

  const list = useMemo(() => msgs.filter((m) => m.status === 'visible' || m.status === 'held').filter((m) => !blocked.includes(m.author.id)).map(toChat), [msgs, blocked]);

  return {
    mode: 'live',
    loading,
    joined: !!info?.membership,
    list,
    freeText: info?.policy.freeText,
    find: (id) => {
      const m = msgs.find((x) => x.id === id);
      return m ? toChat(m) : undefined;
    },
    author: (id) => (id === YOU && profile ? { id: YOU, name: '', role: 'you', look: profile.look } : authors.current.get(id)),
    members: (info?.members ?? []).filter((m) => !m.isYou).map((m) => ({ id: m.id, name: m.name, role: roleOf(m.role), look: m.look ?? DEFAULT_LOOK })),
    sampleIds: new Set((info?.members ?? []).filter((m) => m.isSample).map((m) => m.id)),
    blocked,
    send: async ({ text, replyTo, quick }) => {
      try {
        const r = await api.post<{ message: ServerMsg }>(`/circles/${circleId}/messages`, { body: text, replyTo, quickReply: quick, clientId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}` });
        setMsgs((cur) => (cur.some((x) => x.id === r.message.id) ? cur : [...cur, r.message]));
        return { ok: true, held: r.message.status === 'held' };
      } catch (e) {
        if (e instanceof ApiError && e.code === 'policy_blocked') return { ok: false, flags: (e.details?.flags as ModerationFlag[]) ?? [] };
        return { ok: false, message: e instanceof ApiError ? e.message : undefined, reason: e instanceof ApiError ? e.code : 'internal' };
      }
    },
    react: (m, key) => {
      void api
        .post<{ message: ServerMsg }>(`/messages/${m.id}/reactions`, { reaction: key })
        .then((r) => setMsgs((cur) => cur.map((x) => (x.id === r.message.id ? { ...r.message, author: x.author } : x))))
        .catch(() => undefined);
    },
    report: async (m, reason) => {
      try {
        await api.post(`/messages/${m.id}/report`, { reason });
        setMsgs((cur) => cur.filter((x) => x.id !== m.id));
        return true;
      } catch {
        return false;
      }
    },
    block: (id) => {
      setBlocked((b) => [...new Set([...b, id])]);
      void api.post(`/blocks/${id}`).catch(() => setBlocked((b) => b.filter((x) => x !== id)));
    },
    unblock: (id) => {
      setBlocked((b) => b.filter((x) => x !== id));
      void api.del(`/blocks/${id}`).catch(() => undefined);
    },
    reload: () => void load(),
  };
}

/* ── Circle list (live) ──────────────────────────────────────── */

export type JoinReason = 'age-band' | 'unmoderated' | 'needs-guardian' | 'needs-consent' | 'needs-account';
export interface LiveCircle {
  id: string;
  name: L10n;
  joined: boolean;
  members: number;
  join: null | { ok: true } | { ok: false; reason: JoinReason };
}

export function useLiveCircles(enabled: boolean) {
  const [circles, setCircles] = useState<LiveCircle[] | null>(null);
  const load = useCallback(async () => {
    try {
      setCircles((await api.get<{ circles: LiveCircle[] }>('/circles')).circles);
    } catch {
      setCircles([]);
    }
  }, []);
  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);
  const join = useCallback(
    async (id: string) => {
      await api.post(`/circles/${id}/join`);
      reconnectStream(); // subscribe to the new circle's realtime channel
      await load();
    },
    [load],
  );
  const leave = useCallback(
    async (id: string) => {
      await api.post(`/circles/${id}/leave`);
      reconnectStream();
      await load();
    },
    [load],
  );
  return { circles, reload: load, join, leave };
}

const NONE: string[] = [];
/** Circles this person belongs to: the server's answer when connected, the device's when offline. */
export function useJoinedCircleIds(): string[] {
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const local = useCommunity((s) => s.joined);
  const { circles } = useLiveCircles(online);
  return useMemo(() => (online ? (circles?.filter((c) => c.joined).map((c) => c.id) ?? NONE) : local), [online, circles, local]);
}
