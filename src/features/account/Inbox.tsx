/** Notifications: what SAJA delivered, what's scheduled, and how you want to be reached. */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/brand/Icon';
import { Button, EmptyState, ErrorState, Section, StarLoader, Switch, toast } from '@/design-system';
import { Page } from '@/app/Page';
import { useI18n, type TKey } from '@/i18n';
import { useConnection } from '@/store/connection';
import { api } from '@/api/client';
import { onServerEvent, refreshUnread } from '@/api/sync';
import { disablePush, enablePush, pushState, type PushState } from '@/api/push';
import type { ServerNotification } from '@/api/types';
import './account.css';

const CATS = ['prayer', 'mission', 'circle', 'scholar', 'moderation', 'unlock', 'reflection'] as const;
type Cat = (typeof CATS)[number];
type Prefs = Record<Cat, { inApp: boolean; push: boolean }>;
const ICON: Record<Cat, IconName> = { prayer: 'moon', mission: 'play', circle: 'community', scholar: 'scholar', moderation: 'shield', unlock: 'sparkle', reflection: 'heart' };

export default function Inbox() {
  const { t, l, intl } = useI18n();
  const navigate = useNavigate();
  const status = useConnection((s) => s.status);
  const me = useConnection((s) => s.me);
  const [items, setItems] = useState<ServerNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [prefs, setPrefs] = useState<{ categories: Prefs; pushAllowed: boolean } | null>(null);
  const [push, setPush] = useState<PushState | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [n, p] = await Promise.all([api.get<{ items: ServerNotification[]; unread: number }>('/notifications'), api.get<{ categories: Prefs; pushAllowed: boolean }>('/notifications/preferences')]);
      setItems(n.items);
      setPrefs(p);
      useConnection.getState().set({ unread: n.unread });
      setPush(p.pushAllowed ? await pushState().catch(() => 'unsupported' as const) : null);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (status === 'online' && me) void load();
  }, [status, me, load]);
  useEffect(() => onServerEvent('notification', () => void load()), [load]);

  if (status !== 'online' || !me) {
    return (
      <Page eyebrow={t('inbox.eyebrow')} title={t('inbox.title')}>
        {status === 'connecting' ? <StarLoader label={t('state.loading')} /> : <EmptyState icon="bell" title={t('inbox.offlineTitle')} body={t('inbox.offlineBody')} />}
      </Page>
    );
  }

  const open = async (n: ServerNotification) => {
    if (n.status === 'delivered') {
      await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
      void refreshUnread();
    }
    if (n.url) navigate(n.url);
    else void load();
  };

  const savePrefs = async (next: Prefs) => {
    setPrefs((p) => (p ? { ...p, categories: next } : p));
    try {
      await api.put('/notifications/preferences', { categories: next });
    } catch {
      toast(t('err.internal'));
      void load();
    }
  };

  const delivered = items?.filter((n) => n.status !== 'scheduled') ?? [];
  const scheduled = items?.filter((n) => n.status === 'scheduled') ?? [];
  const when = (iso: string) => new Intl.DateTimeFormat(intl, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

  return (
    <Page eyebrow={t('inbox.eyebrow')} title={t('inbox.title')} sub={t('inbox.sub')}>
      {failed ? (
        <ErrorState onRetry={load} />
      ) : !items ? (
        <StarLoader label={t('state.loading')} />
      ) : (
        <div className="stack" style={{ gap: 28 }}>
          <Section title={t('inbox.recent')}>
            {delivered.length === 0 ? (
              <p className="muted">{t('inbox.empty')}</p>
            ) : (
              <ul className="inbox-list">
                {delivered.map((n) => (
                  <li key={n.id}>
                    <button type="button" className="inbox-item" data-unread={n.status === 'delivered' ? '' : undefined} onClick={() => void open(n)} style={{ width: '100%', textAlign: 'start', border: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                      <Icon name={ICON[n.category as Cat] ?? 'bell'} size={20} />
                      <span style={{ display: 'grid', gap: 2 }}>
                        <strong>{l(n.title)}</strong>
                        <span className="t-small muted">{l(n.body)}</span>
                      </span>
                      <span className="t-caption muted">{n.delivered_at ? when(n.delivered_at) : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          {scheduled.length > 0 && (
            <Section title={t('inbox.scheduled')}>
              <ul className="inbox-list">
                {scheduled.map((n) => (
                  <li key={n.id} className="inbox-item">
                    <Icon name="clock" size={20} />
                    <span style={{ display: 'grid', gap: 2 }}>
                      <strong>{l(n.title)}</strong>
                      <span className="t-small muted">{when(n.scheduled_for)}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api.del(`/notifications/${n.id}`).catch(() => undefined);
                        void load();
                      }}
                    >
                      {t('a.cancel')}
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {prefs && (
            <Section title={t('inbox.prefs')}>
              <div className="card stack">
                {push !== null && (
                  <div className="pref-row">
                    <span>
                      {t('inbox.push')}
                      <span className="t-small muted" style={{ display: 'block' }}>
                        {t(`inbox.push.${push}` as TKey)}
                      </span>
                    </span>
                    <Switch
                      label={t('inbox.push')}
                      checked={push === 'on'}
                      disabled={push === 'unsupported' || push === 'server-disabled' || push === 'denied'}
                      onChange={async (v) => {
                        try {
                          setPush(v ? await enablePush() : await disablePush());
                        } catch {
                          toast(t('err.internal'));
                        }
                      }}
                    />
                  </div>
                )}
                {!prefs.pushAllowed && <p className="t-small muted">{t('inbox.kidsNoPush')}</p>}
                {CATS.map((c) => (
                  <div className="pref-row" key={c}>
                    <span>
                      <Icon name={ICON[c]} size={16} /> {t(`inbox.cat.${c}`)}
                    </span>
                    <Switch label={t(`inbox.cat.${c}`)} checked={prefs.categories[c].inApp} onChange={(v) => void savePrefs({ ...prefs.categories, [c]: { ...prefs.categories[c], inApp: v, push: v && prefs.categories[c].push } })} />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Page>
  );
}
