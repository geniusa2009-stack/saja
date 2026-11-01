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
}
let tid = 0;
export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const id = ++tid;
    set({ items: [...get().items.slice(-2), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), t.action ? 6000 : 3800);
  },
  dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
}));
export const toast = (text: string, opts: Omit<ToastItem, 'id' | 'text'> = {}) => useToasts.getState().push({ text, ...opts });

