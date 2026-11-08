import { create } from 'zustand';

/* ── Toasts ────────────────────────────────────────────────── */
export interface ToastItem {
  id: number;
  text: string;
  tone?: 'info' | 'warn' | 'error';
  action?: { label: string; run: () => void };
}
interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
  clearNonCritical: () => void;
}
let tid = 0;
const recentNoticeTime = new Map<string, number>();
const NOTICE_DEDUP_MS = 5500;
export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const key = `${t.tone ?? 'info'}:${t.text}`;
    const now = Date.now();
    if (!t.action) {
      const last = recentNoticeTime.get(key);
      if (last !== undefined && now - last < NOTICE_DEDUP_MS) return;
      recentNoticeTime.set(key, now);
      for (const [notice, at] of recentNoticeTime) {
        if (now - at >= NOTICE_DEDUP_MS) recentNoticeTime.delete(notice);
      }
    }
    const id = ++tid;
    set({ items: [...get().items.slice(-2), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), t.action ? 6000 : 3800);
  },
  dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
  clearNonCritical: () => set({ items: get().items.filter((i) => i.tone === 'error') }),
}));
export const toast = (text: string, opts: Omit<ToastItem, 'id' | 'text'> = {}) => useToasts.getState().push({ text, ...opts });

