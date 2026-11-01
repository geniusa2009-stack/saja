/**
 * Community service — pure operations over circle state.
 * All writes pass through the safety policy here, so restrictions hold
 * even if a UI control were bypassed.
 */
import type { ChatMessage, Circle } from '@/content/community';
import { MISSIONS, MISSION_BY_NUMBER } from '@/content/missions';
import type { Mission } from '@/domain/types';
import { canJoinCircle, moderateMessage, type ModerationFlag, type ParentalSettings, type SafetyPolicy } from '@/domain/safety';

export const YOU = 'you';

export type SendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; reason: 'blocked'; flags: ModerationFlag[] }
  | { ok: false; reason: 'not-member' | 'free-text-disabled' | 'empty' | 'too-long' };

export interface SendArgs {
  circle: Circle;
  joined: string[];
  text: string;
  replyTo?: string;
  policy: SafetyPolicy;
  isQuickReply?: boolean;
  now?: number;
}

export const MAX_MESSAGE = 500;

export function composeMessage({ circle, joined, text, replyTo, policy, isQuickReply, now = Date.now() }: SendArgs): SendResult {
  const body = text.trim();
  if (!joined.includes(circle.id)) return { ok: false, reason: 'not-member' };
  if (!body) return { ok: false, reason: 'empty' };
  if (body.length > MAX_MESSAGE) return { ok: false, reason: 'too-long' };
  if (!policy.freeText && !isQuickReply) return { ok: false, reason: 'free-text-disabled' };

  const mod = isQuickReply ? ({ status: 'ok', flags: [] } as const) : moderateMessage(body, policy);
  if (mod.status === 'blocked') return { ok: false, reason: 'blocked', flags: mod.flags };
  return {
    ok: true,
    message: {
      id: `u${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      circleId: circle.id,
      authorId: YOU,
      text: body,
      at: now,
      replyTo,
      reactions: {},
      status: mod.status === 'held' ? 'held' : 'sent',
    },
  };
}

export function toggleReaction(msg: ChatMessage, key: string, who = YOU): ChatMessage {
  const list = msg.reactions[key] ?? [];
  const next = list.includes(who) ? list.filter((w) => w !== who) : [...list, who];
  return { ...msg, reactions: { ...msg.reactions, [key]: next } };
}

export function joinDecision(policy: SafetyPolicy, circle: Circle, parental: ParentalSettings) {
  return canJoinCircle(policy, { id: circle.id, ageBand: circle.ageBand, moderated: circle.moderated }, parental);
}

/** Messages visible to the viewer: hides blocked authors and removed messages. */
export function visibleMessages(messages: ChatMessage[], circleId: string, blocked: string[]): ChatMessage[] {
  return messages.filter((m) => m.circleId === circleId && m.status !== 'removed' && !blocked.includes(m.authorId)).sort((a, b) => a.at - b.at);
}

/**
 * Chat understands the journey: "Mission 5", "المهمة ٥" or a mission title
 * becomes a link straight into that mission.
 */
export function detectMissionRefs(text: string): Mission[] {
  const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const found = new Map<string, Mission>();
  for (const m of latin.matchAll(/\b(?:mission|m)\s*#?\s*(\d{1,2})\b|المهمة\s*(?:رقم\s*)?(\d{1,2})/giu)) {
    const n = Number(m[1] ?? m[2]);
    const mission = MISSION_BY_NUMBER[n];
    if (mission) found.set(mission.id, mission);
  }
  const lower = text.toLowerCase();
  for (const mission of MISSIONS) {
    if (lower.includes(mission.title.en.toLowerCase()) || text.includes(mission.title.ar)) found.set(mission.id, mission);
  }
  return [...found.values()];
}
