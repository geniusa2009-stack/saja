/** Small building blocks shared by the staff console's tabs. */
import { useState, type ReactNode } from 'react';
import { Button, TextInput } from '@/design-system';
import { useI18n } from '@/i18n';

export function Reasoned({ actions, onAct, placeholder }: { actions: { id: string; label: string; tone?: 'danger' | 'emerald' | 'secondary' }[]; onAct: (id: string, reason: string) => void; placeholder: string }) {
  const [reason, setReason] = useState('');
  return (
    <div className="staff-actions">
      <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={300} />
      {actions.map((a) => (
        <Button key={a.id} size="sm" variant={a.tone ?? 'secondary'} disabled={reason.trim().length < 3} onClick={() => onAct(a.id, reason.trim())}>
          {a.label}
        </Button>
      ))}
    </div>
  );
}

export function When({ iso }: { iso: string }) {
  const { intl } = useI18n();
  return <span className="t-caption muted">{new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))}</span>;
}

export function Card({ children }: { children: ReactNode }) {
  return <li className="card staff-card">{children}</li>;
}
