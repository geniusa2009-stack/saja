/** Shared verification UI for AMANAH and NOUR. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ClaimVerdict, VerifiedClaim } from '@/domain/types';
import { STAGES, type Stage, type VerificationResult } from '@/services/verification';
import { Button, DemoNote } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useScholar } from '@/store/scholar';
import { EvidenceLayer } from './EvidencePanel';

const VERDICT_GLYPH: Record<ClaimVerdict, string> = { supported: '✓', 'needs-context': '⚠', mismatch: '✗', unverified: '○', review: '?' };

export function Pipeline({ stage, skipTranscribe }: { stage: Stage | null; skipTranscribe?: boolean }) {
  const { t } = useI18n();
  const stages = STAGES.filter((s) => !(skipTranscribe && s === 'transcribe'));
  const idx = stage ? stages.indexOf(stage) : -1;
  return (
    <ol className="pipeline" aria-label="Pipeline">
      {stages.map((s, i) => (
        <li key={s} className="pipeline__step" data-state={i < idx || stage === 'done' ? 'done' : i === idx ? 'active' : 'todo'}>
          <span className="pipeline__dot">{i < idx || stage === 'done' ? <Icon name="check" size={12} /> : i + 1}</span>
          <span>{t(`am.stage.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

export function VerdictSummary({ result }: { result: VerificationResult }) {
  const { t } = useI18n();
  return (
    <div className="verdicts">
      <p className="verdicts__total">{t('am.claimsFound', { n: result.claims.length })}</p>
      <div className="row wrap" style={{ '--row-gap': '8px' } as React.CSSProperties}>
        {(Object.keys(result.counts) as ClaimVerdict[]).map((v) => (
          <span key={v} className={`vchip vchip--${v}`}>
            <b aria-hidden>{VERDICT_GLYPH[v]}</b> {result.counts[v]} · {t(`am.v.${v}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnnotatedDraft({ result, active, onPick }: { result: VerificationResult; active: string | null; onPick: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="annotated" aria-label={t('am.draft')}>
      {result.sentences.map((s, i) => {
        const c = s.claimId ? result.claims.find((x) => x.id === s.claimId) : undefined;
        return c ? (
          <button key={i} type="button" className={`ann ann--${c.verdict}`} data-active={active === c.id || undefined} onClick={() => onPick(c.id)}>
            {s.text}{' '}
          </button>
        ) : (
          <span key={i}>{s.text} </span>
        );
      })}
    </div>
  );
}

export function ClaimCard({
  claim,
  index,
  active,
  onApply,
  onSendReview,
}: {
  claim: VerifiedClaim;
  index: number;
  active?: boolean;
  onApply?: (claim: VerifiedClaim) => void;
  /** Live: creates a real question in the scholar queue. Absent offline (kept on this device only). */
  onSendReview?: (claim: VerifiedClaim) => Promise<boolean>;
}) {
  const { t, l } = useI18n();
  const [ev, setEv] = useState(false);
  const [rev, setRev] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useScholar((s) => s.submit);
  return (
    <motion.article id={`claim-${claim.id}`} layout className={`claim claim--${claim.verdict}`} data-active={active || undefined}>
      <div className="claim__head">
        <span className="claim__glyph" aria-hidden>
          {VERDICT_GLYPH[claim.verdict]}
        </span>
        <span className="claim__label">
          {t('am.claimN', { n: index + 1 })} · {t(`am.v.${claim.verdict}`)}
        </span>
      </div>
      <p className="claim__text">“{claim.text}”</p>
      <p className="t-small">{l(claim.explanation)}</p>
      <div className="row wrap" style={{ '--row-gap': '8px' } as React.CSSProperties}>
        {claim.evidence.length > 0 && (
          <Button size="sm" variant="secondary" icon="layers" onClick={() => setEv((x) => !x)} aria-expanded={ev}>
            {ev ? t('ev.hide') : t('ev.show')}
          </Button>
        )}
        {claim.suggestion && (
          <Button size="sm" variant="secondary" icon="wand" onClick={() => setRev((x) => !x)} aria-expanded={rev}>
            {t('am.suggest')}
          </Button>
        )}
        {(claim.verdict === 'review' || claim.verdict === 'mismatch' || claim.verdict === 'unverified') && (
          <Button
            size="sm"
            variant="ghost"
            icon="scholar"
            disabled={sent}
            onClick={async () => {
              if (onSendReview) {
                if (await onSendReview(claim)) setSent(true);
                return;
              }
              submit({ question: claim.text, context: 'AMANAH content review', topic: 'other' });
              setSent(true);
            }}
          >
            {sent ? (onSendReview ? t('am.sentReview') : t('am.sentReviewLocal')) : t('am.sendReview')}
          </Button>
        )}
      </div>
      <AnimatePresence>
        {rev && claim.suggestion && (
          <motion.div className="claim__rev" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p>{l(claim.suggestion)}</p>
            {onApply && (
              <Button size="sm" variant="emerald" icon="check" onClick={() => onApply(claim)}>
                {t('am.apply')}
              </Button>
            )}
          </motion.div>
        )}
        {ev && (
          <motion.div className="stack" style={{ '--stack-gap': '8px' } as React.CSSProperties} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {claim.evidence.map((e) => (
              <EvidenceLayer key={e.ref} ev={e} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

/** Verdicts come from curated claim rules: say how many a scholar has actually reviewed. */
export function RuleReviewNote({ result }: { result: VerificationResult | null }) {
  const { t } = useI18n();
  const rules = result && 'rules' in result ? (result as { rules: { total: number; published: number } | null }).rules : null;
  if (!rules || rules.published >= rules.total) return null;
  return <DemoNote>{t('am.rulesDemo', { published: rules.published, total: rules.total })}</DemoNote>;
}
