/**
 * AMANAH — creator integrity. SAJA's editorial sibling: the same gateway drawn
 * as an outline, a seal kept in trust. Ivory paper, ink navy, trust colours.
 *
 * Content → claims → sources → verification → issues → human review.
 * AMANAH never pretends to make every religious judgment: anything it cannot
 * match to a curated source is marked "requires human review".
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { VerifiedClaim } from '@/domain/types';
import { runVerification, TranscriptionUnavailableError, type SourceKind, type Stage, type VerificationResult } from '@/services/verification';
import { Button, DemoNote, EmptyState, Field, Segmented, TextArea, TextInput, toast } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { GATEWAY_D } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { AnnotatedDraft, ClaimCard, Pipeline, RuleReviewNote, VerdictSummary } from './Verification';
import { useConnection } from '@/store/connection';
import { OcrUnavailableError, recordRevision, runServerAudit, sendClaimToScholars, type ServerAuditResult } from '@/services/audits';
import { ApiError } from '@/api/client';
import './amanah.css';

const SAMPLE = {
  en: {
    title: 'Ramadan for Kids — Ep. 2 script',
    body: 'Ramadan is a special month. Fasting in Ramadan is one of the five pillars of Islam, and the Qur’an was first revealed in this month. Every child must fast from the age of seven, and Laylat al-Qadr is the 27th night. The Prophet ﷺ said that whoever fasts the first day will never feel hungry again.',
  },
  ar: {
    title: 'رمضان للأطفال — نص الحلقة ٢',
    body: 'رمضان شهر مميز. صيام رمضان ركن من أركان الإسلام الخمسة، ونزل القرآن في شهر رمضان. يجب على كل طفل الصيام من سن السابعة، وليلة القدر هي ليلة السابع والعشرين. قال النبي ﷺ إن من صام أول يوم لن يشعر بالجوع أبدًا.',
  },
};

export function AmanahSeal({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} aria-hidden>
      <path d={GATEWAY_D} fill="none" stroke="currentColor" strokeWidth="7" />
      <circle cx="60" cy="88" r="12" fill="#C9A45C" />
    </svg>
  );
}

export default function Amanah() {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<SourceKind>('script');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stage, setStage] = useState<Stage | null>(null);
  const [result, setResult] = useState<VerificationResult | ServerAuditResult | null>(null);
  const [error, setError] = useState<'transcription' | 'ocr' | 'generic' | 'offline' | string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const media = kind === 'audio' || kind === 'video';

  const analyze = async (textOverride?: string, file?: File) => {
    setError(null);
    setResult(null);
    try {
      const r = online
        ? await runServerAudit({ tool: 'amanah', kind: media && !textOverride ? kind : 'script', title, text: file ? undefined : (textOverride ?? body), file, locale }, setStage)
        : await runVerification({ kind: media && !textOverride ? kind : 'text', text: textOverride ?? (media ? undefined : body) }, setStage);
      setResult(r);
    } catch (e) {
      setStage(null);
      setError(e instanceof TranscriptionUnavailableError ? 'transcription' : e instanceof OcrUnavailableError ? 'ocr' : e instanceof ApiError ? (e.offline ? 'offline' : e.message) : 'generic');
    }
  };

  const apply = (claim: VerifiedClaim) => {
    if (!claim.suggestion) return;
    const next = body.replace(claim.text, claim.suggestion[locale]);
    // Live: the accepted revision is recorded against the audit before re-checking.
    if (result && 'auditId' in result) void recordRevision(result.auditId, claim.id, claim.suggestion[locale]).catch(() => undefined);
    setBody(next);
    toast(t('am.applied'));
    void analyze(next);
  };

  const sendReview =
    result && 'auditId' in result
      ? async (claim: VerifiedClaim) => {
          try {
            await sendClaimToScholars(result.auditId, claim.id);
            toast(t('am.sentReview'));
            return true;
          } catch (e) {
            toast(e instanceof ApiError ? e.message : t('err.internal'));
            return false;
          }
        }
      : undefined;

  return (
    <div className="amanah">
      <div className="amanah-page">
        <header className="amanah-head">
          <span className="amanah-brand">
            <AmanahSeal size={26} />
            <span>AMANAH</span>
          </span>
          <h1 className="t-h1">{t('am.sub')}</h1>
          <p className="amanah-intro">{t('am.intro')}</p>
        </header>

        <section className="amanah-card">
          <div className="amanah-form">
            <Field label={t('am.kind')}>
              <Segmented label={t('am.kind')} value={kind} onChange={(k) => { setKind(k); setResult(null); setError(null); }} options={(['post', 'article', 'script', 'transcript', 'audio', 'video'] as SourceKind[]).map((k) => ({ value: k, label: t(`am.kind.${k as 'post'}`) }))} />
            </Field>
            <Field label={t('am.titleField')} htmlFor="am-title">
              <TextInput id="am-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('am.titlePh')} />
            </Field>
            {media && !error ? (
              <label className="amanah-drop">
                <Icon name={kind === 'audio' ? 'mic' : 'video'} size={28} />
                <strong>{t('nour.drop')}</strong>
                <span className="t-small">{t('am.media')}</span>
                <input type="file" accept={kind === 'audio' ? 'audio/mpeg,audio/wav,audio/mp4,audio/ogg' : 'video/mp4,video/webm'} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(undefined, online ? f : undefined); }} />
              </label>
            ) : (
              <Field label={t('am.content')} htmlFor="am-body">
                <TextArea id="am-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('am.contentPh')} rows={7} />
              </Field>
            )}
            <div className="row wrap">
              <Button
                variant="ghost"
                icon="file"
                onClick={() => {
                  setKind('script');
                  setTitle(SAMPLE[locale].title);
                  setBody(SAMPLE[locale].body);
                  setError(null);
                }}
              >
                {t('am.sample')}
              </Button>
              <span className="spacer" />
              {!media && (
                <Button icon="seal" onClick={() => void analyze()} disabled={!body.trim() || (stage !== null && stage !== 'done')} loading={stage !== null && stage !== 'done'}>
                  {t('am.analyze')}
                </Button>
              )}
            </div>
          </div>

          {(stage || result) && <Pipeline stage={stage} skipTranscribe={!media} />}

          {error === 'transcription' && (
            <div className="amanah-unavailable" role="alert">
              <Icon name="info" size={20} />
              <div>
                <p>{t('am.transcriptionUnavailable')}</p>
                <Button size="sm" variant="secondary" onClick={() => { setKind('transcript'); setError(null); }}>
                  {t('am.pasteInstead')}
                </Button>
              </div>
            </div>
          )}
          {error === 'ocr' && (
            <div className="amanah-unavailable" role="alert">
              <Icon name="info" size={20} />
              <p>{t('nour.ocrUnavailable')}</p>
            </div>
          )}
          {error === 'offline' && <p role="alert">{t('err.offline')}</p>}
          {error && !['transcription', 'ocr', 'offline'].includes(error) && <p role="alert">{error === 'generic' ? t('state.error') : error}</p>}
        </section>

        <AnimatePresence>
          {result && (
            <motion.section className="amanah-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {result.claims.length === 0 ? (
                <EmptyState icon="seal" title={t('am.noClaims')} />
              ) : (
                <>
                  <VerdictSummary result={result} />
                  <div className="amanah-split">
                    <div>
                      <p className="t-caption amanah-muted">{title || t('am.draft')}</p>
                      <AnnotatedDraft
                        result={result}
                        active={active}
                        onPick={(id) => {
                          setActive(id);
                          document.getElementById(`claim-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                      />
                    </div>
                    <div className="stack">
                      {result.claims.map((c, i) => (
                        <ClaimCard key={c.id} claim={c} index={i} active={active === c.id} onApply={apply} onSendReview={sendReview} />
                      ))}
                    </div>
                  </div>
                </>
              )}
              <p className="amanah-limits">
                <Icon name="shield" size={16} /> {t('am.limits')}
              </p>
              <RuleReviewNote result={result} />
            </motion.section>
          )}
        </AnimatePresence>
        {online ? (
          <p className="amanah-limits">
            <Icon name="cloud" size={16} /> {t('am.onlineNote')}
          </p>
        ) : (
          <DemoNote>{t('am.offlineNote')}</DemoNote>
        )}
      </div>
    </div>
  );
}
