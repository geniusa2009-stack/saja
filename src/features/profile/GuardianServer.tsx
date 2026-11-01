/**
 * Guardian consent, enforced on the server:
 *  - a child/teen creates a one-time code (7 days) on their device;
 *  - an adult with an account enters it and gives consent;
 *  - from then on the guardian — not the child — controls circles, replies,
 *    time and the approved age group. Revoking consent removes the child from circles.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/brand/Icon';
import { Button, Chip, Field, Section, Segmented, Switch, TextInput, toast } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { useConnection } from '@/store/connection';
import { api, ApiError } from '@/api/client';
import { refreshMe } from '@/api/sync';
import { CIRCLES } from '@/content/community';
import '@/features/account/account.css';
import { UsageLine } from '@/features/account/RestScreen';
import type { UsageStatus } from '@/api/types';

const CONSENT: Record<string, TKey> = { not_required: 'acc.consent.none', pending: 'acc.consent.pending', granted: 'acc.consent.granted', revoked: 'acc.consent.revoked' };

export function ChildGuardianPanel() {
  const { t } = useI18n();
  const me = useConnection((s) => s.me);
  const [code, setCode] = useState<string | null>(null);
  if (!me) return null;
  const p = me.user.parental;
  return (
    <Section title={t('guard.title')} id="guardian">
      <div className="card stack">
        <div className="row wrap" style={{ gap: 8 }}>
          <span>{t('acc.consent')}:</span>
          <Chip tone={me.user.age.consent === 'granted' ? 'emerald' : 'demo'}>{t(CONSENT[me.user.age.consent])}</Chip>
        </div>
        {me.user.age.consent !== 'granted' && <p className="t-small muted">{me.user.ageBand === 'child' ? t('guard.childNeeds') : t('guard.teenOptional')}</p>}
        {code ? (
          <div className="stack">
            <div className="code-box" aria-live="polite">
              {code}
            </div>
            <p className="t-small muted">{t('guard.codeHow')}</p>
          </div>
        ) : (
          <Button
            variant="secondary"
            icon="key"
            onClick={async () => {
              try {
                setCode((await api.post<{ code: string }>('/guardian/link-code')).code);
              } catch (e) {
                toast(e instanceof ApiError ? e.message : t('err.internal'));
              }
            }}
          >
            {me.user.age.consent === 'granted' ? t('guard.newCode') : t('guard.getCode')}
          </Button>
        )}
        {me.user.ageBand === 'child' && <UsageLine />}
        {me.user.ageBand === 'child' && (
          <dl className="kv t-small">
            <dt>{t('guard.approve')}</dt>
            <dd>{p.approveCircles ? t('guard.on') : t('guard.off')}</dd>
            <dt>{t('guard.quickOnly')}</dt>
            <dd>{p.quickRepliesOnly ? t('guard.on') : t('guard.off')}</dd>
            <dt>{t('guard.time')}</dt>
            <dd>{p.dailyMinutes ? t('time.min', { n: p.dailyMinutes }) : t('guard.timeNone')}</dd>
          </dl>
        )}
        <p className="t-caption muted">
          <Icon name="shield" size={14} /> {t('guard.managedBy')}
        </p>
      </div>
    </Section>
  );
}

interface Child {
  id: string;
  name: string | null;
  declared_band: 'child' | 'teen' | 'adult' | null;
  approved_band: 'child' | 'teen' | 'adult' | null;
  guardian_consent: string;
  approve_circles: boolean | null;
  quick_replies_only: boolean | null;
  daily_minutes: number | null;
  approved_circles: string[];
  usage: UsageStatus | null;
}

export function GuardianPanel() {
  const { t, l } = useI18n();
  const me = useConnection((s) => s.me);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const load = useCallback(async () => {
    try {
      setChildren((await api.get<{ children: Child[] }>('/guardian/children')).children);
    } catch {
      setChildren([]);
    }
  }, []);
  const isAccount = !!me && !me.user.isGuest;
  useEffect(() => {
    if (isAccount) void load();
  }, [isAccount, load]);
  if (!me) return null;
  const run = async (fn: () => Promise<unknown>, ok: TKey) => {
    try {
      await fn();
      toast(t(ok));
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t('err.internal'));
    }
  };
  return (
    <Section title={t('guard.adultTitle')} id="guardian">
      <div className="card stack">
        <p className="t-small muted">{t('guard.adultSub')}</p>
        {!isAccount ? (
          <p className="t-small">
            {t('guard.needAccount')} <Link to="/account">{t('acc.signup')}</Link>
          </p>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api.post('/guardian/accept', { code, consent: true });
                setCode('');
                setConsent(false);
                await refreshMe();
              }, 'guard.linked');
            }}
          >
            <Field label={t('guard.enterCode')} htmlFor="g-code">
              <TextInput id="g-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoComplete="off" style={{ letterSpacing: '0.18em', fontFamily: 'var(--font-mono)' }} />
            </Field>
            <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
              <span className="t-small">{t('guard.consentText')}</span>
            </label>
            <Button type="submit" disabled={code.length !== 8 || !consent}>
              {t('guard.linkCta')}
            </Button>
          </form>
        )}
        {children?.map((c) => {
          const band = c.approved_band ?? c.declared_band ?? 'child';
          const settings = { approveCircles: c.approve_circles ?? true, quickRepliesOnly: c.quick_replies_only ?? false, dailyMinutes: c.daily_minutes ?? 45 };
          const save = (p: Partial<typeof settings>) => run(() => api.put(`/guardian/children/${c.id}/settings`, { ...settings, ...p }), 'guard.saved');
          return (
            <div key={c.id} className="card stack" style={{ background: 'var(--surface)' }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <strong>{c.name ?? '—'}</strong>
                <Chip tone="quiet">
                  {t(c.approved_band ? 'acc.ageApproved' : 'acc.ageDeclared')}: {t(`acc.band.${band}`)}
                </Chip>
                <Chip tone={c.guardian_consent === 'granted' ? 'emerald' : 'demo'}>{t(CONSENT[c.guardian_consent] ?? 'acc.consent.none')}</Chip>
              </div>
              <div className="pref-row">
                <span>{t('guard.approve')}</span>
                <Switch checked={settings.approveCircles} onChange={(v) => void save({ approveCircles: v })} label={t('guard.approve')} />
              </div>
              <div className="pref-row">
                <span>{t('guard.quickOnly')}</span>
                <Switch checked={settings.quickRepliesOnly} onChange={(v) => void save({ quickRepliesOnly: v })} label={t('guard.quickOnly')} />
              </div>
              <div className="pref-row">
                <span>{t('guard.time')}</span>
                <Segmented label={t('guard.time')} value={String(settings.dailyMinutes)} onChange={(v) => void save({ dailyMinutes: Number(v) })} options={['0', '30', '45', '60'].map((v) => ({ value: v, label: v === '0' ? t('guard.timeNone') : t('time.min', { n: Number(v) }) }))} />
              </div>
              {c.usage?.enforced && (
                <div className="pref-row">
                  <span>
                    {t('guard.usageToday', { used: Math.floor(c.usage.usedSeconds / 60), total: c.usage.limitMinutes + c.usage.extraMinutes })}
                    {c.usage.limited && <span className="t-small muted" style={{ display: 'block' }}>{t('guard.limitReached')}</span>}
                  </span>
                  <Button size="sm" variant="secondary" icon="plus" onClick={() => void run(() => api.post(`/guardian/children/${c.id}/extend`, { minutes: 15 }), 'guard.extended')}>
                    {t('guard.extend')}
                  </Button>
                </div>
              )}
              <div className="pref-row">
                <span>{t('guard.approvedAge')}</span>
                <Segmented label={t('guard.approvedAge')} value={band} onChange={(v) => void run(() => api.post(`/guardian/children/${c.id}/age`, { band: v }), 'guard.saved')} options={(['child', 'teen', 'adult'] as const).map((b) => ({ value: b, label: t(`acc.band.${b}`) }))} />
              </div>
              <div>
                <p className="t-caption muted">{t('guard.approved')}</p>
                <div className="row wrap" style={{ marginTop: 6, gap: 6 }}>
                  {CIRCLES.filter((x) => x.ageBand === band).map((x) => {
                    const ok = c.approved_circles.includes(x.id);
                    return (
                      <Chip key={x.id} tone={ok ? 'emerald' : 'quiet'} icon={ok ? 'check' : 'plus'} onClick={ok ? undefined : () => void run(() => api.post(`/guardian/children/${c.id}/circles/${x.id}`), 'guard.saved')}>
                        {l(x.name)}
                      </Chip>
                    );
                  })}
                </div>
              </div>
              <Button variant="danger" size="sm" icon="block" onClick={() => void run(() => api.post(`/guardian/children/${c.id}/revoke`), 'guard.revoked')}>
                {t('guard.revoke')}
              </Button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
