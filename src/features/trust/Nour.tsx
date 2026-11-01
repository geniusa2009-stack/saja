/**
 * NOUR — check something you saw or heard (a forwarded message, a screenshot,
 * a clip). OCR / transcription → claims → sources → verification → result.
 * Media needs the NOUR transcription service; without it we say so and let
 * the person paste the text — we never pretend to have read or heard a file.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { runVerification, TranscriptionUnavailableError, type SourceKind, type Stage, type VerificationResult } from '@/services/verification';
import { Button, DemoNote, EmptyState, Segmented, TextArea } from '@/design-system';
import { Icon, type IconName } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { AnnotatedDraft, ClaimCard, Pipeline, RuleReviewNote, VerdictSummary } from './Verification';
import { useConnection } from '@/store/connection';
import { OcrUnavailableError, runServerAudit, sendClaimToScholars, type ServerAuditResult } from '@/services/audits';
import { ApiError } from '@/api/client';
import { toast } from '@/design-system';
import type { VerifiedClaim } from '@/domain/types';

type Mode = 'text' | 'image' | 'audio' | 'video';

const SAMPLE = {
  en: 'Forwarded many times ⚠️ The Prophet ﷺ said whoever shares this message will receive good news within three days! Remember that the Qur’an was revealed in Ramadan. Laylat al-Qadr is the 27th night, so don’t miss it. And Ramadan is always in summer, so prepare early.',
  ar: 'أُعيد توجيهها كثيرًا ⚠️ قال النبي ﷺ إن من ينشر هذه الرسالة سيأتيه خبر سار خلال ثلاثة أيام! تذكّر أن القرآن نزل في شهر رمضان. ليلة القدر هي ليلة السابع والعشرين فلا تفوّتها. ورمضان دائما في الصيف فاستعد مبكرًا.',
};

const MODE_ICON: Record<Mode, IconName> = { text: 'file', image: 'image', audio: 'mic', video: 'video' };

export default function Nour() {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage | null>(null);
  const [result, setResult] = useState<VerificationResult | ServerAuditResult | null>(null);
  const [unavailable, setUnavailable] = useState<false | 'transcription' | 'ocr'>(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const online = useConnection((s) => s.status === 'online' && !!s.me);
  const busy = stage !== null && stage !== 'done';

  const run = async (kind: SourceKind, body?: string, file?: File) => {
    setResult(null);
    setUnavailable(false);
    setFailure(null);
    try {
      setResult(
        online
          ? await runServerAudit({ tool: 'nour', kind, text: body, file, locale }, setStage)
          : await runVerification({ kind, text: body, file: file ? { name: file.name, type: file.type, size: file.size } : undefined }, setStage),
      );
    } catch (e) {
      setStage(null);
      if (e instanceof TranscriptionUnavailableError) setUnavailable('transcription');
      else if (e instanceof OcrUnavailableError) setUnavailable('ocr');
      else setFailure(e instanceof ApiError ? (e.offline ? t('err.offline') : e.message) : t('state.error'));
    }
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
    <Page eyebrow={t('nav.nour')} title={t('nour.sub')} sub={t('nour.intro')}>
      <div className="stack" style={{ '--stack-gap': '22px' } as React.CSSProperties}>
        <section className="card card--raised stack">
          <Segmented
            label={t('nour.title')}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setResult(null);
              setUnavailable(false);
              setStage(null);
            }}
            options={(['text', 'image', 'audio', 'video'] as Mode[]).map((m) => ({ value: m, label: t(`nour.${m}`) }))}
          />
          {mode === 'text' ? (
            <>
              <label className="sr-only" htmlFor="nour-text">
                {t('nour.pastePh')}
              </label>
              <TextArea id="nour-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('nour.pastePh')} rows={5} />
              <div className="row wrap">
                <Button variant="ghost" icon="sparkle" onClick={() => setText(SAMPLE[locale])}>
                  {t('nour.sample')}
                </Button>
                <span className="spacer" />
                <Button icon="eye" onClick={() => void run('text', text)} disabled={!text.trim() || busy} loading={busy}>
                  {t('nour.check')}
                </Button>
              </div>
            </>
          ) : (
            <label className="nour-drop">
              <Icon name={MODE_ICON[mode]} size={30} />
              <strong>{t('nour.drop')}</strong>
              <span className="t-small muted">{t('nour.dropSub')}</span>
              <input type="file" className="sr-only" accept={mode === 'image' ? 'image/png,image/jpeg,image/webp,application/pdf' : mode === 'audio' ? 'audio/mpeg,audio/wav,audio/mp4,audio/ogg' : 'video/mp4,video/webm'} onChange={(e) => e.target.files?.[0] && void run(mode === 'image' ? 'screenshot' : mode, undefined, e.target.files[0])} />
            </label>
          )}
          <p className="t-small muted">{t('nour.pipeline')}</p>
          {(stage || result) && <Pipeline stage={stage} skipTranscribe={mode === 'text'} />}
          {unavailable && (
            <div className="nour-unavailable" role="alert">
              <Icon name="info" size={20} />
              <div>
                <p>{unavailable === 'ocr' ? t('nour.ocrUnavailable') : t('am.transcriptionUnavailable')}</p>
                <Button size="sm" variant="secondary" style={{ marginTop: 10 }} onClick={() => { setMode('text'); setUnavailable(false); setStage(null); }}>
                  {t('am.pasteInstead')}
                </Button>
              </div>
            </div>
          )}
          {failure && <p role="alert">{failure}</p>}
        </section>

        <AnimatePresence>
          {result && (
            <motion.section className="stack" style={{ '--stack-gap': '18px' } as React.CSSProperties} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {result.claims.length === 0 ? (
                <EmptyState icon="eye" title={t('am.noClaims')} />
              ) : (
                <>
                  <VerdictSummary result={result} />
                  <AnnotatedDraft result={result} active={active} onPick={(id) => { setActive(id); document.getElementById(`claim-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} />
                  <div className="nour-claims">
                    {result.claims.map((c, i) => (
                      <ClaimCard key={c.id} claim={c} index={i} active={active === c.id} onSendReview={sendReview} />
                    ))}
                  </div>
                </>
              )}
              <p className="t-small muted row" style={{ '--row-gap': '6px' } as React.CSSProperties}>
                <Icon name="shield" size={14} /> {t('am.limits')}
              </p>
              <RuleReviewNote result={result} />
            </motion.section>
          )}
        </AnimatePresence>
        {online ? (
          <p className="t-small muted row" style={{ '--row-gap': '6px' } as React.CSSProperties}>
            <Icon name="cloud" size={14} /> {t('am.onlineNote')}
          </p>
        ) : (
          <DemoNote>{t('am.offlineNote')}</DemoNote>
        )}
      </div>
    </Page>
  );
}
