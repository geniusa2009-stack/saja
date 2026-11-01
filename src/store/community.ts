import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CIRCLES, seedMessages, type ChatMessage } from '@/content/community';
import { canJoinCircle, getSafetyPolicy } from '@/domain/safety';
import { composeMessage, type SendResult } from '@/services/community';
import { useProfile } from './profile';
import { KEY, storage } from './storage';

export interface Report {
  id: string;
  messageId: string;
  reason: 'unkind' | 'unsafe' | 'personal-info' | 'wrong-info' | 'other';
  at: number;
}

interface CommunityState {
  joined: string[];
  pending: string[]; // awaiting guardian approval
  messages: ChatMessage[];
  blocked: string[];
  reports: Report[];
  /** Enforces the safety policy; returns false if not allowed. */
  join: (id: string) => boolean;
  /** Moderates and enforces membership/policy before anything is stored. */
  send: (args: { circleId: string; text: string; replyTo?: string; isQuickReply?: boolean }) => SendResult;
  leave: (id: string) => void;
  requestJoin: (id: string) => void;
  cancelRequest: (id: string) => void;
  add: (m: ChatMessage) => void;
  update: (m: ChatMessage) => void;
  block: (memberId: string) => void;
  unblock: (memberId: string) => void;
  report: (r: Omit<Report, 'id' | 'at'>) => void;
  reset: () => void;
}

export const useCommunity = create<CommunityState>()(
  persist(
    (set, get) => ({
      joined: [],
      pending: [],
      messages: seedMessages(),
      blocked: [],
      reports: [],
      join: (id) => {
        const circle = CIRCLES.find((c) => c.id === id);
        const { profile, parental } = useProfile.getState();
        if (!circle || !profile) return false;
        const policy = getSafetyPolicy(profile.ageBand, parental);
        if (!canJoinCircle(policy, { id, ageBand: circle.ageBand, moderated: circle.moderated }, parental).ok) return false;
        set({ joined: [...new Set([...get().joined, id])], pending: get().pending.filter((p) => p !== id) });
        return true;
      },
      send: ({ circleId, text, replyTo, isQuickReply }) => {
        const circle = CIRCLES.find((c) => c.id === circleId);
        const { profile, parental } = useProfile.getState();
        if (!circle || !profile) return { ok: false, reason: 'not-member' };
        const res = composeMessage({ circle, joined: get().joined, text, replyTo, isQuickReply, policy: getSafetyPolicy(profile.ageBand, parental) });
        if (res.ok) set({ messages: [...get().messages, res.message] });
        return res;
      },
      leave: (id) => set({ joined: get().joined.filter((j) => j !== id) }),
      requestJoin: (id) => set({ pending: [...new Set([...get().pending, id])] }),
      cancelRequest: (id) => set({ pending: get().pending.filter((p) => p !== id) }),
      add: (m) => set({ messages: [...get().messages, m] }),
      update: (m) => set({ messages: get().messages.map((x) => (x.id === m.id ? m : x)) }),
      block: (id) => set({ blocked: [...new Set([...get().blocked, id])] }),
      unblock: (id) => set({ blocked: get().blocked.filter((b) => b !== id) }),
      report: (r) => set({ reports: [...get().reports, { ...r, id: `rep${Date.now()}`, at: Date.now() }] }),
      reset: () => set({ joined: [], pending: [], messages: seedMessages(), blocked: [], reports: [] }),
    }),
    { name: KEY('community'), storage },
  ),
);
