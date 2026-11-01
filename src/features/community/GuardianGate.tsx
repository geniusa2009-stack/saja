import { useMemo, useState } from 'react';
import { Button, Dialog, TextInput } from '@/design-system';
import { useI18n } from '@/i18n';

/**
 * A light "grown-up check" before guardian actions. It's friction, not
 * security — real deployments pair this with a verified guardian account.
 */
export function GuardianGate({ open, onClose, onPass }: { open: boolean; onClose: () => void; onPass: () => void }) {
  const { t } = useI18n();
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 7), 7 + Math.floor(Math.random() * 6)], [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [v, setV] = useState('');
  const [err, setErr] = useState(false);
  const submit = () => {
    if (Number(v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) === a * b) {
      setV('');
      setErr(false);
      onPass();
    } else setErr(true);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('guard.gate')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('a.cancel')}
          </Button>
          <Button onClick={submit}>{t('a.continue')}</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="stack"
        style={{ marginTop: 8 }}
      >
        <label htmlFor="gate-in">{t('guard.gateQ', { a, b })}</label>
        <TextInput id="gate-in" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} data-autofocus aria-invalid={err} />
        {err && (
          <p role="alert" style={{ color: '#f1b98a' }}>
            {t('guard.gateWrong')}
          </p>
        )}
      </form>
    </Dialog>
  );
}
