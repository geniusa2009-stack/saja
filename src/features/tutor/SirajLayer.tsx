/**
 * Siraj — "the guide lives inside the journey as a small light, never a chat window."
 * A floating light opens a calm conversation that starts from context
 * ("You just completed your first prayer mission…"), not "How can I help?".
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { tutor, type TutorIntent, type TutorReply } from '@/services/tutor';
import { getKnowledge } from '@/content/knowledge';
import { Button, ConfidenceBadge, IconButton, Sheet, useReducedMotion } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { useTutor, type TutorTurn } from '@/store/tutor';
import { useScholar } from '@/store/scholar';
import { EvidenceSheet } from '@/features/trust/EvidencePanel';
import { useJourneyContext } from './context';
import './siraj.css';

const INTENTS: TutorIntent[] = ['simple', 'deep', 'example', 'quiz', 'source', 'why', 'continue', 'plan', 'next'];

export default function SirajLayer() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const open = useTutor((s) => s.open);
  const openTutor = useTutor((s) => s.openTutor);
  const reduced = useReducedMotion();
  const hideLauncher = pathname === '/'; // the world HUD has its own "Ask Siraj"
  // Conversation screens have a composer at the bottom: the launcher sits above it, never over "send".
  const aboveComposer = /^\/(circles|messages)\/[^/]+$/.test(pathname);
  return (
    <>
      {!hideLauncher && !open && (
        <motion.button type="button" className="siraj-launch" data-lift={aboveComposer || undefined} onClick={() => openTutor()} aria-label={t('tutor.open')} initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="siraj-launch__glow" aria-hidden />
          <Star size={18} color="currentColor" />
        </motion.button>
      )}
      <TutorSheet />
      <EvidenceSheet />
    </>
  );
}

function TutorSheet() {
  const { t, l } = useI18n();
  const navigate = useNavigate();
  const open = useTutor((s) => s.open);
  const focus = useTutor((s) => s.focusKnowledgeId);
  const turns = useTutor((s) => s.turns);
  const push = useTutor((s) => s.push);
  const clear = useTutor((s) => s.clear);
  const close = useTutor((s) => s.close);
  const showEvidence = useTutor((s) => s.showEvidence);
  const setDraft = useScholar((s) => s.setDraft);
  const ctx = useJourneyContext(focus);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Contextual opening: greet from what just happened, once per opening.
  useEffect(() => {
    if (!open || !ctx) return;
    const reply = tutor.greet(ctx);
    const last = turns[turns.length - 1];
    if (!last || last.reply?.text !== reply.text) push({ id: reply.id, from: 'siraj', reply, at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focus]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, thinking]);

  const ask = async (intent?: TutorIntent, q?: string) => {
    if (!ctx || thinking) return;
    const label = q ?? (intent ? t(`tutor.i.${intent}`) : '');
    if (!label) return;
    push({ id: `u${Date.now()}`, from: 'you', text: label, at: Date.now() });
    setThinking(true);
    setError(false);
    try {
      const reply = await tutor.respond({ intent, text: q, ctx });
      push({ id: reply.id, from: 'siraj', reply, at: Date.now() });
    } catch {
      setError(true);
    } finally {
      setThinking(false);
    }
  };

  const follow = (r: TutorReply) => {
    if (!r.route) return;
    if (r.route.kind === 'mission') {
      close();
      navigate(`/mission/${r.route.id}`);
    } else if (r.route.kind === 'scholar') {
      setDraft(r.route.draft);
      close();
      navigate('/scholar');
    } else if (r.route.kind === 'day') {
      close();
      navigate('/day');
    } else if (r.route.kind === 'evidence') showEvidence(r.route.knowledgeId);
  };

  const lastReply = [...turns].reverse().find((x) => x.from === 'siraj')?.reply;
  const suggestions = lastReply?.followUps.length ? lastReply.followUps : INTENTS.slice(0, 4);

  return (
    <Sheet
      open={open}
      onClose={close}
      className="siraj-sheet"
      title={
        <span className="siraj-title">
          <span className="siraj-orb" aria-hidden>
            <Star size={14} color="currentColor" />
          </span>
          <span>
            {t('tutor.title')}
            <span className="siraj-sub">{t('tutor.subtitle')}</span>
          </span>
        </span>
      }
      footer={
        <form
          className="siraj-input"
          onSubmit={(e) => {
            e.preventDefault();
            const q = text.trim();
            if (!q) return;
            setText('');
            void ask(undefined, q);
          }}
        >
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('tutor.placeholder')} aria-label={t('tutor.placeholder')} maxLength={400} />
          <IconButton icon="send" label={t('a.send')} type="submit" disabled={!text.trim() || thinking} />
        </form>
      }
    >
      <p className="siraj-note">
        <Icon name="info" size={14} /> {tutor.mode === 'offline' ? t('tutor.offline') : ''} {t('tutor.notScholar')}
      </p>
      <div className="siraj-list" ref={listRef} aria-live="polite">
        {turns.map((turn) => (
          <Turn key={turn.id} turn={turn} onFollow={follow} onEvidence={showEvidence} />
        ))}
        {thinking && (
          <div className="siraj-thinking" role="status">
            <span className="star-breath">
              <Star size={14} color="currentColor" />
            </span>
            {t('tutor.thinking')}
          </div>
        )}
        {error && (
          <p className="siraj-error" role="alert">
            {t('tutor.error')}
          </p>
        )}
      </div>
      <div className="siraj-intents" role="group" aria-label={t('tutor.subtitle')}>
        {suggestions.map((i) => (
          <button key={i} type="button" className="chip" onClick={() => void ask(i)} disabled={thinking}>
            {t(`tutor.i.${i}`)}
          </button>
        ))}
        {suggestions.length < 6 &&
          INTENTS.filter((i) => !suggestions.includes(i))
            .slice(0, 3)
            .map((i) => (
              <button key={i} type="button" className="chip chip--quiet" onClick={() => void ask(i)} disabled={thinking}>
                {t(`tutor.i.${i}`)}
              </button>
            ))}
      </div>
      {turns.length > 2 && (
        <Button variant="ghost" size="sm" icon="trash" onClick={clear} style={{ marginTop: 8 }}>
          {t('tutor.clear')}
        </Button>
      )}
      {focus && getKnowledge(focus) && <span className="sr-only">{l(getKnowledge(focus)!.question)}</span>}
    </Sheet>
  );
}

function Turn({ turn, onFollow, onEvidence }: { turn: TutorTurn; onFollow: (r: TutorReply) => void; onEvidence: (id: string) => void }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);
  if (turn.from === 'you') {
    return (
      <motion.div className="bubble bubble--you" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {turn.text}
      </motion.div>
    );
  }
  const r = turn.reply!;
  return (
    <motion.div className={`bubble bubble--siraj bubble--${r.state}`} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {r.state === 'unsure' && (
        <span className="siraj-state">
          <Icon name="info" size={14} /> {t('tutor.unsure')}
        </span>
      )}
      {r.status === 'context-needed' && (
        <span className="siraj-state">
          <Icon name="info" size={14} /> {t('tutor.st.context')}
        </span>
      )}
      <p>{r.text}</p>
      {r.quiz && (
        <div className="siraj-quiz">
          <p style={{ fontWeight: 700 }}>{r.quiz.question}</p>
          {r.quiz.options.map((o, i) => (
            <button key={i} type="button" className="siraj-quiz__opt" data-state={picked === null ? undefined : o.correct ? 'right' : picked === i ? 'wrong' : undefined} onClick={() => setPicked(i)} disabled={picked !== null}>
              {o.label}
            </button>
          ))}
          <AnimatePresence>
            {picked !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-small">
                <strong>{r.quiz.options[picked].correct ? t('tutor.quizRight') : t('tutor.quizNotQuite')}</strong> {r.quiz.options.find((o) => o.correct)?.why}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
      {(r.generatedBy || r.offlineFallback) && (
        <span className="t-caption muted bubble__source">
          {r.offlineFallback ? t('tutor.offlineFallback') : t(`tutor.by.${r.generatedBy!}`)}
        </span>
      )}
      {(r.confidence || r.knowledgeId || r.route) && (
        <div className="bubble__meta">
          {r.confidence && <ConfidenceBadge level={r.confidence} />}
          {r.demoContent && <span className="chip chip--demo">{t('state.demo')}</span>}
          <span className="spacer" />
          {r.knowledgeId && r.route?.kind !== 'evidence' && (
            <button type="button" className="bubble__link" onClick={() => onEvidence(r.knowledgeId!)}>
              <Icon name="layers" size={14} /> {t('tutor.showEvidence')}
            </button>
          )}
          {r.route && (
            <Button size="sm" variant={r.route.kind === 'scholar' ? 'emerald' : 'secondary'} iconEnd="forward" onClick={() => onFollow(r)}>
              {r.route.kind === 'mission' ? t('tutor.goMission') : r.route.kind === 'scholar' ? t('tutor.goScholar') : r.route.kind === 'day' ? t('tutor.goDay') : t('tutor.showEvidence')}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
