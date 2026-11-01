/**
 * Account: guests can keep their journey by adding an email + password (the guest
 * is upgraded in place on the server), sign in on another device, reset a password,
 * sign out, or delete everything. Roles and age approvals are shown, never editable here.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/brand/Icon';
import { Button, Chip, Dialog, EmptyState, Field, Segmented, StarLoader, TextInput, toast } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { useConnection } from '@/store/connection';
import { api, ApiError } from '@/api/client';
import { signIn, signOut, signUp, resetLocal } from '@/api/sync';
import { ModeBadge } from './ConnectionStatus';
import './account.css';

type Mode = 'signup' | 'signin' | 'reset';

export function Standalone({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <>
      <div className="night-backdrop" aria-hidden />
      <div className="standalone">
        <div className="standalone__top">
          <Button variant="ghost" icon="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
            {t('a.back')}
          </Button>
          <span className="spacer" />
          <ModeBadge />
        </div>
        <main id="main" className="page" style={{ paddingTop: 8 }}>
          <h1 className="t-h1" style={{ marginBottom: 16 }}>
            {title}
          </h1>
          {children}
        </main>
      </div>
    </>
  );
}

function useErrorText() {
  const { t } = useI18n();
  return (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.code === 'offline') return t('err.offline');
      if (e.code === 'rate_limited') return t('err.rate_limited');
      return e.message;
    }
    return t('err.internal');
  };
}

export default function Account() {
  const { t } = useI18n();
  const status = useConnection((s) => s.status);
  const me = useConnection((s) => s.me);
  if (status === 'connecting') {
    return (
      <Standalone title={t('acc.title')}>
        <StarLoader label={t('state.loading')} />
      </Standalone>
    );
  }
  if (status === 'offline') {
    return (
      <Standalone title={t('acc.title')}>
        <EmptyState icon="cloud" title={t('acc.offlineTitle')} body={t('acc.offlineBody')} />
      </Standalone>
    );
  }
  return <Standalone title={t('acc.title')}>{me && !me.user.isGuest ? <SignedIn /> : <AuthForms guest={!!me} />}</Standalone>;
}

function AuthForms({ guest }: { guest: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const errText = useErrorText();
  const [mode, setMode] = useState<Mode>(guest ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | 'smtp' | 'dev-outbox'>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        toast(t('acc.created'));
        navigate('/profile');
      } else if (mode === 'signin') {
        await signIn(email.trim(), password);
        toast(t('acc.welcomeBack'));
        navigate('/');
      } else {
        const r = await api.post<{ delivery: 'smtp' | 'dev-outbox' }>('/auth/reset/request', { email: email.trim() });
        setSent(r.delivery);
      }
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth-card stack">
      <Segmented<Mode>
        label={t('acc.title')}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
          setSent(null);
        }}
        options={[
          { value: 'signup', label: t('acc.signup') },
          { value: 'signin', label: t('acc.signin') },
          { value: 'reset', label: t('acc.reset') },
        ]}
      />
      <p className="t-small muted">{mode === 'signup' ? (guest ? t('acc.signupGuest') : t('acc.signupNew')) : mode === 'signin' ? t('acc.signinBody') : t('acc.resetBody')}</p>
      {sent ? (
        <div className="safety-note" role="status">
          <Icon name="check" size={16} />
          <span>{sent === 'smtp' ? t('acc.resetSent') : t('acc.resetOutbox')}</span>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field label={t('acc.email')} htmlFor="acc-email">
            <TextInput id="acc-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {mode !== 'reset' && (
            <Field label={t('acc.password')} hint={mode === 'signup' ? t('acc.passwordHint') : undefined} htmlFor="acc-pw">
              <TextInput id="acc-pw" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 10 : 1} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy || !email || (mode !== 'reset' && !password)}>
            {busy ? t('state.loading') : mode === 'signup' ? t('acc.signupCta') : mode === 'signin' ? t('acc.signinCta') : t('acc.resetCta')}
          </Button>
          {mode === 'signin' && guest && <p className="t-caption muted">{t('acc.signinReplaces')}</p>}
        </form>
      )}
    </div>
  );
}

const CONSENT: Record<string, TKey> = { not_required: 'acc.consent.none', pending: 'acc.consent.pending', granted: 'acc.consent.granted', revoked: 'acc.consent.revoked' };

function SignedIn() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useConnection((s) => s.me)!;
  const [confirm, setConfirm] = useState(false);
  const band = (b: string | null) => (b ? t(`acc.band.${b as 'child' | 'teen' | 'adult'}`) : '—');
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="card stack">
        <dl className="kv">
          <dt>{t('acc.email')}</dt>
          <dd>{me.user.email}</dd>
          <dt>{t('acc.roles')}</dt>
          <dd className="row wrap">
            {me.user.roles.map((r) => (
              <Chip key={r} tone={r === 'learner' ? 'quiet' : 'gold'}>
                {t(`role.${r}`)}
              </Chip>
            ))}
          </dd>
          <dt>{t('acc.ageDeclared')}</dt>
          <dd>{band(me.user.age.declared)}</dd>
          <dt>{t('acc.ageApproved')}</dt>
          <dd>{band(me.user.age.approved)}</dd>
          <dt>{t('acc.consent')}</dt>
          <dd>{t(CONSENT[me.user.age.consent])}</dd>
        </dl>
        <p className="t-caption muted">{t('acc.serverDecides')}</p>
        <p className="t-caption muted">{t('acc.ageNotVerified')}</p>
      </div>
      <div className="row wrap">
        {me.user.roles.some((r) => r !== 'learner' && r !== 'guardian') && (
          <Button variant="secondary" icon="shield" onClick={() => navigate('/staff')}>
            {t('staff.title')}
          </Button>
        )}
        <Button
          variant="secondary"
          icon="back"
          onClick={async () => {
            await signOut();
            toast(t('acc.signedOut'));
            navigate('/welcome');
          }}
        >
          {t('acc.signout')}
        </Button>
        <span className="spacer" />
        <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>
          {t('acc.delete')}
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('acc.deleteTitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('a.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await api.post('/auth/delete-account');
                await signOut();
                resetLocal();
                navigate('/welcome');
              }}
            >
              {t('acc.deleteConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('acc.deleteBody')}</p>
      </Dialog>
    </div>
  );
}

export function ResetPassword() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const errText = useErrorText();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Standalone title={t('acc.newPassword')}>
      <form
        className="card auth-card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.post('/auth/reset/confirm', { token, password });
            toast(t('acc.passwordChanged'));
            navigate('/account');
          } catch (err) {
            setError(errText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {!token && <p className="form-error">{t('acc.noToken')}</p>}
        <Field label={t('acc.password')} hint={t('acc.passwordHint')} htmlFor="reset-pw">
          <TextInput id="reset-pw" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !token || password.length < 10}>
          {t('acc.newPasswordCta')}
        </Button>
      </form>
    </Standalone>
  );
}
