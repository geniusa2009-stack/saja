/**
 * Where SAJA's truth lives right now.
 *
 *  online  — the SAJA server is reachable: it is authoritative for age, consent,
 *            roles, memory, progress, circles, scholars and audits.
 *  offline — no server (static hosting, network down, or tests): the app keeps
 *            working on-device in a clearly labelled DEMO mode with the same
 *            client-side safety rules as a first line.
 */
import { create } from 'zustand';
import type { Me, SystemStatus, UsageStatus } from '@/api/types';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  system: SystemStatus | null;
  me: Me | null;
  unread: number;
  /** Today's guardian time limit, as measured by the server (null when not applicable or offline). */
  usage: UsageStatus | null;
  set: (p: Partial<Omit<ConnectionState, 'set'>>) => void;
}

export const useConnection = create<ConnectionState>()((set) => ({
  status: 'connecting',
  system: null,
  me: null,
  unread: 0,
  usage: null,
  set: (p) => set(p),
}));

export const isOnline = () => useConnection.getState().status === 'online';
export const useOnline = () => useConnection((s) => s.status === 'online');
const NO_ROLES: readonly string[] = [];
export const useRoles = () => useConnection((s) => s.me?.user.roles ?? NO_ROLES);
export const hasRole = (roles: readonly string[], ...want: string[]) => want.some((w) => roles.includes(w));
/** True when the server says the guardian's daily time limit has been reached. */
export const useTimeLimited = () => useConnection((s) => !!s.usage?.limited && s.status === 'online');
