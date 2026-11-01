/**
 * The trust layer. "Every answer carries its layers. Each layer has its own
 * colour and edge, so a child and a scholar can both see what is known, from
 * where, and what is still open."
 *
 *   Answer → Evidence (matched passage) → Source → Context → Where scholars differ → Requires review
 */
import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { Evidence, KnowledgeEntry } from '@/domain/types';
import { useKnowledgeEntry, type Provenance } from '@/api/content';
import { Button, ConfidenceBadge, DemoNote, Sheet, StarLoader, useReducedMotion } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useProgress } from '@/store/progress';
import { useTutor } from '@/store/tutor';
import { useScholar } from '@/store/scholar';
import './trust.css';

export function EvidenceLayer({ ev }: { ev: Evidence }) {
  const { t, l } = useI18n();
  return (
    <div className={`ev-layer ev-layer--${ev.kind}`}>
      <div className="ev-layer__head">
        <span className="ev-layer__kind">{ev.kind === 'quran' ? t('ev.evidence') : t('ev.source')}</span>
        <span className="ev-layer__ref">
          {t(`ev.kind.${ev.kind}`)} · {ev.ref}
        </span>
      </div>
      {ev.arabic && (
        <p className="arabic-text ev-arabic" lang="ar">
          {ev.arabic}
        </p>
      )}
      {(!ev.arabic || l(ev.text) !== ev.arabic) && <p className="ev-quote">{ev.rendering === 'translation' ? `“${l(ev.text)}”` : l(ev.text)}</p>}
      <span className="ev-rendering">{ev.rendering === 'translation' ? t('ev.translation', { name: ev.translationName ?? '' }) : t('ev.meaning')}</span>
    </div>
  );
}

/** Where this content came from, which version, and who reviewed it. */
function ProvenanceLayer({ p }: { p: Provenance }) {
  const { t, intl } = useI18n();
  const date = (iso: string) => new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(new Date(iso));
  const approved = p.reviews.find((r) => r.toStatus === 'approved');
  const published = p.reviews.find((r) => r.toStatus === 'published');
  return (
    <div className="ev-layer ev-layer--provenance">
      <span className="ev-layer__kind">{t('ev.provenance')}</span>
      <p className="t-small">
        {p.source === 'server' ? t('ev.fromServer', { v: p.version ?? '—' }) : t('ev.fromBundle')}
        {' · '}
        {t(`ev.status.${p.status}`)}
      </p>
      {approved && (
        <p className="t-small">
          {approved.scholar ? t('ev.approvedBy', { name: approved.scholar.name, scope: approved.scope, date: date(approved.at) }) : t('ev.approvedRole', { scope: approved.scope, date: date(approved.at) })}
        </p>
      )}
      {published && <p className="t-small">{t('ev.publishedOn', { date: date(published.at) })}</p>}
      {p.status === 'demo' && <p className="t-small muted">{t('ev.demoProvenance')}</p>}
    </div>
  );
}

export function EvidencePanel({ entry: given, defaultOpen = false, answer, compact }: { entry: KnowledgeEntry; defaultOpen?: boolean; answer?: string; compact?: boolean }) {
  const { t, l } = useI18n();
  // The server's (pinned) version when online; the bundled demo copy only offline — and it says so.
  const live = useKnowledgeEntry(given.id);
  const entry = live.state === 'ready' ? live.data.entry : given;
  const provenance: Provenance = live.state === 'ready' ? live.data.provenance : { source: 'bundled-demo', version: null, status: 'demo', reviews: [], origin: 'bundled', changeNote: null };
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const saved = useProgress((s) => s.saved.includes(entry.id));
  const toggleSaved = useProgress((s) => s.toggleSaved);
  const setDraft = useScholar((s) => s.setDraft);
  const closeTutor = useTutor((s) => s.close);
  const showEvidence = useTutor((s) => s.showEvidence);
  const regionId = useId();

  return (
    <article className={`ev ${compact ? 'ev--compact' : ''}`}>
      <div className="ev-answer">
        <span className="ev-label">{t('ev.answer')}</span>
        <p className="ev-answer__text">{answer ?? l(entry.simple)}</p>
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <ConfidenceBadge level={entry.confidence} />
          {entry.reviewStatus !== 'reviewed' && <span className="chip chip--demo">{t('state.demoContent')}</span>}
        </div>
      </div>

      <button type="button" className="ev-toggle" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((o) => !o)}>
        <Icon name="layers" size={18} />
        {open ? t('ev.hide') : t('ev.show')}
        <Icon name={open ? 'up' : 'down'} size={16} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={regionId}
            className="ev-stack"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.21, 1] }}
          >
            {entry.evidence.map((ev) => (
              <EvidenceLayer key={ev.ref} ev={ev} />
            ))}
            <div className="ev-layer ev-layer--context">
              <span className="ev-layer__kind">{t('ev.context')}</span>
              <p>{l(entry.context)}</p>
            </div>
            <div className="ev-layer ev-layer--explain">
              <span className="ev-layer__kind">{t('ev.explanation')}</span>
              <p>{l(entry.why)}</p>
              <span className="ev-rendering">{t('ev.generated')}</span>
            </div>
            {entry.uncertainty && (
              <div className="ev-layer ev-layer--difference">
                <span className="ev-layer__kind">{t('ev.uncertainty')}</span>
                <p>{l(entry.uncertainty)}</p>
              </div>
            )}
            <div className="ev-layer ev-layer--review">
              <span className="ev-layer__kind">{t('ev.review')}</span>
              <p>{t('ev.reviewBody')}</p>
              <Button
                size="sm"
                variant="secondary"
                icon="scholar"
                onClick={() => {
                  setDraft('');
                  closeTutor();
                  showEvidence(null);
                  navigate('/scholar');
                }}
              >
                {t('tutor.goScholar')}
              </Button>
            </div>
            <ProvenanceLayer p={provenance} />
            {entry.reviewStatus !== 'reviewed' && <DemoNote />}
            <Button size="sm" variant="ghost" icon={saved ? 'check' : 'plus'} onClick={() => toggleSaved(entry.id)} aria-pressed={saved}>
              {saved ? t('ev.saved') : t('ev.save')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/** Global sheet: any part of SAJA can call `useTutor.getState().showEvidence(id)`. */
export function EvidenceSheet() {
  const { t, l } = useI18n();
  const id = useTutor((s) => s.evidenceFor);
  const show = useTutor((s) => s.showEvidence);
  const k = useKnowledgeEntry(id);
  return (
    <Sheet open={!!id} onClose={() => show(null)} title={k.state === 'ready' ? l(k.data.entry.question) : t('ev.evidence')}>
      {k.state === 'loading' ? (
        <StarLoader label={t('state.loading')} />
      ) : k.state === 'ready' ? (
        <EvidencePanel entry={k.data.entry} defaultOpen />
      ) : (
        <p className="muted">{t('ev.unavailable')}</p>
      )}
    </Sheet>
  );
}
