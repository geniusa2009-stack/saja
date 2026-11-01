/**
 * Honest capability labelling: which parts of SAJA are REAL right now and which are
 * running as demo / unavailable. Driven by GET /api/system/status — never guessed.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/brand/Icon';
import { Sheet } from '@/design-system';
import { useI18n, type TKey } from '@/i18n';
import { useConnection } from '@/store/connection';
import type { AiState, SystemStatus } from '@/api/types';
import './account.css';

type Tone = 'real' | 'demo' | 'off';

/** Plain words, no provider names: available / using fallback / temporarily unavailable / offline mode. */
const AI_ROW: Record<AiState, { value: TKey; tone: Tone }> = {
  available: { value: 'sys.v.aiAvailable', tone: 'real' },
  fallback: { value: 'sys.v.aiFallback', tone: 'real' },
  unverified: { value: 'sys.v.aiUnverified', tone: 'demo' },
  unavailable: { value: 'sys.v.aiUnavailable', tone: 'off' },
  offline: { value: 'sys.v.extractive', tone: 'demo' },
};
const aiState = (sys: SystemStatus): AiState => sys.ai?.state ?? (sys.modes.ai === 'provider' ? 'unverified' : 'offline');

function capabilityRows(sys: SystemStatus): { key: TKey; value: TKey; tone: Tone }[] {
  const m = sys.modes;
  return [
    { key: 'sys.database', value: m.database === 'postgres' ? 'sys.v.postgres' : m.database === 'pglite' ? 'sys.v.pglite' : 'sys.v.memory', tone: m.database === 'pglite-memory' ? 'demo' : 'real' },
    { key: 'sys.ai', ...AI_ROW[aiState(sys)] },
    { key: 'sys.retrieval', value: m.embeddings !== 'local-lexical' ? 'sys.v.semantic' : 'sys.v.lexical', tone: m.embeddings !== 'local-lexical' ? 'real' : 'demo' },
    { key: 'sys.ocr', value: m.ocr !== 'unavailable' ? 'sys.v.on' : 'sys.v.unavailable', tone: m.ocr !== 'unavailable' ? 'real' : 'off' },
    { key: 'sys.transcription', value: m.transcription !== 'unavailable' ? 'sys.v.on' : 'sys.v.unavailable', tone: m.transcription !== 'unavailable' ? 'real' : 'off' },
    { key: 'sys.frameOcr', value: m.frameOcr !== 'unavailable' ? 'sys.v.on' : 'sys.v.unavailable', tone: m.frameOcr !== 'unavailable' ? 'real' : 'off' },
    { key: 'sys.push', value: m.push === 'web-push' ? 'sys.v.on' : 'sys.v.inAppOnly', tone: m.push === 'web-push' ? 'real' : 'off' },
    { key: 'sys.email', value: m.email === 'smtp' ? 'sys.v.on' : 'sys.v.outbox', tone: m.email === 'smtp' ? 'real' : 'demo' },
    { key: 'sys.content', value: sys.content.reviewed ? 'sys.v.reviewed' : sys.content.publishedDocuments > 0 ? 'sys.v.mixedContent' : 'sys.v.demoContent', tone: sys.content.reviewed ? 'real' : 'demo' },
  ];
}

/** Small pill: "Connected", "Connected · using fallback AI", "Connected · AI offline mode", "Offline demo"… Opens the full capability sheet. */
export function ModeBadge({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const status = useConnection((s) => s.status);
  const system = useConnection((s) => s.system);
  const [open, setOpen] = useState(false);
  const hadSession = useConnection((s) => !!s.me);
  // Lost the connection mid-journey → "will sync"; never connected → the offline demo.
  const ai = system ? aiState(system) : 'offline';
  const online = ai === 'offline' ? t('sys.onlineDemo') : ai === 'fallback' ? t('sys.onlineFallback') : ai === 'unavailable' ? t('sys.onlineAiDown') : t('sys.onlineAi');
  const label = status === 'online' ? online : status === 'offline' ? (hadSession ? t('sys.offlineSync') : t('sys.offline')) : t('sys.connecting');
  return (
    <>
      <button type="button" className="mode-badge" data-status={status} onClick={() => setOpen(true)} aria-label={`${t('sys.title')}: ${label}`} title={label}>
        <span className="mode-badge__dot" aria-hidden />
        {!compact && <span>{label}</span>}
      </button>
      <SystemSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function SystemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const status = useConnection((s) => s.status);
  const system = useConnection((s) => s.system);
  const me = useConnection((s) => s.me);
  return (
    <Sheet open={open} onClose={onClose} title={t('sys.title')} icon={<Icon name="cloud" size={20} />}>
      <div className="stack">
        {status !== 'online' || !system ? (
          <p className="muted">{me ? t('sys.offlineSyncBody') : t('sys.offlineBody')}</p>
        ) : (
          <>
            <p className="t-small muted">{t('sys.intro')}</p>
            <ul className="cap-list">
              {capabilityRows(system).map((r) => (
                <li key={r.key} data-tone={r.tone}>
                  <span>{t(r.key)}</span>
                  <strong>{t(r.value)}</strong>
                </li>
              ))}
            </ul>
            <p className="t-small muted">
              {me ? (me.user.isGuest ? t('sys.guest') : t('sys.account', { email: me.user.email ?? '' })) : t('sys.noSession')}{' '}
              <Link to="/account" onClick={onClose}>
                {t('acc.manage')}
              </Link>
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
