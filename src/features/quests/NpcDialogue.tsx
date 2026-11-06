/**
 * NPC Dialogue — a full-screen, immersive conversation panel.
 *
 * Features:
 *   - Branching dialogue tree with Arabic + English support
 *   - Animated text reveal (per-character typewriter)
 *   - Quest offer integration: shows the accept/decline UI at the right moment
 *   - NPC and player character rendered side by side
 *   - Respects RTL layout
 *   - Accessible: focus-managed, roles, keyboard nav
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, IconButton } from '@/design-system';
import { useI18n } from '@/i18n';
import { NPCS } from '@/content/npcs';
import { Character } from '@/features/character/Character';
import { useProfile } from '@/store/profile';
import { useQuests } from '@/store/quests';
import type { QuestDef, DialogueLine } from './types';
import './npc-dialogue.css';

interface Props {
  quest: QuestDef;
  onClose: () => void;
  /** Called when the quest is accepted — parent starts the quest flow. */
  onAccept: () => void;
}

/** Per-character reveal speed (ms). Reduced-motion: instant. */
const CHAR_MS = 28;

export function NpcDialogue({ quest, onClose, onAccept }: Props) {
  const { l, t, isRTL } = useI18n();
  const profile = useProfile((s) => s.profile);
  const npc = NPCS.find((n) => n.id === quest.npcId)!;
  const questState = useQuests((s) => s.quests[quest.id]);
  const isActive = questState?.status === 'active';
  const isCompleted = questState?.status === 'completed';

  const [lineId, setLineId] = useState(quest.dialogueStart);
  const [revealed, setRevealed] = useState(0); // chars revealed so far
  const [isRevealing, setIsRevealing] = useState(true);
  const [atOffer, setAtOffer] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const line: DialogueLine = quest.dialogue[lineId];
  const text = l(line.text);

  // Typewriter effect
  useEffect(() => {
    setRevealed(0);
    setIsRevealing(true);
    setAtOffer(false);

    // Check for reduced motion preference
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setRevealed(text.length);
      setIsRevealing(false);
      if (line.questOffer) setAtOffer(true);
      return;
    }

    revealTimer.current = setInterval(() => {
      setRevealed((r) => {
        const next = r + 1;
        if (next >= text.length) {
          clearInterval(revealTimer.current!);
          setIsRevealing(false);
          if (line.questOffer) setAtOffer(true);
          return text.length;
        }
        return next;
      });
    }, CHAR_MS);
    return () => {
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, [lineId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Skip to end on tap
  const skipReveal = useCallback(() => {
    if (isRevealing) {
      if (revealTimer.current) clearInterval(revealTimer.current);
      setRevealed(text.length);
      setIsRevealing(false);
      if (line.questOffer) setAtOffer(true);
    }
  }, [isRevealing, text.length, line.questOffer]);

  // Auto-focus the continue button once text is done
  useEffect(() => {
    if (!isRevealing && !atOffer && !line.choices?.length && continueRef.current) {
      continueRef.current.focus();
    }
  }, [isRevealing, atOffer, line.choices]);

  const goTo = useCallback((nextId: string) => {
    setLineId(nextId);
  }, []);

  const handleContinue = useCallback(() => {
    if (line.next) goTo(line.next);
    else onClose();
  }, [line.next, goTo, onClose]);

  const displayText = text.slice(0, revealed);
  const isSpeakingNpc = line.speaker === 'npc';

  return (
    <div
      className="npc-dialogue"
      role="dialog"
      aria-modal="true"
      aria-label={`${l(npc.name)} — ${l(quest.title)}`}
      onClick={skipReveal}
    >
      {/* Backdrop */}
      <div className="npc-dialogue__backdrop" />

      {/* Characters */}
      <div className="npc-dialogue__stage" aria-hidden>
        {/* NPC on one side */}
        <div className={`npc-dialogue__character npc-dialogue__character--npc ${isSpeakingNpc ? 'is-speaking' : ''}`}>
          <Character
            look={npc.look}
            size={110}
            facing={isRTL ? 'right' : 'left'}
            expression={isSpeakingNpc ? 'happy' : 'calm'}
            pose="idle"
            animated
          />
          <span className="npc-dialogue__name">{l(npc.name)}</span>
        </div>

        {/* Player on the other side */}
        {profile && (
          <div className={`npc-dialogue__character npc-dialogue__character--player ${!isSpeakingNpc ? 'is-speaking' : ''}`}>
            <Character
              look={profile.look}
              size={100}
              facing={isRTL ? 'left' : 'right'}
              expression={!isSpeakingNpc ? 'happy' : 'calm'}
              pose="idle"
              animated
            />
          </div>
        )}
      </div>

      {/* Dialogue box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lineId}
          className="npc-dialogue__box"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="npc-dialogue__speaker">
            {isSpeakingNpc ? l(npc.name) : (profile?.name ?? t('a.continue'))}
          </div>

          <p
            className="npc-dialogue__text"
            aria-live="polite"
            aria-atomic="false"
          >
            {displayText}
            {isRevealing && <span className="npc-dialogue__cursor" aria-hidden>▎</span>}
          </p>

          {/* Quest offer */}
          <AnimatePresence>
            {atOffer && !isActive && !isCompleted && (
              <motion.div
                className="npc-dialogue__offer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="npc-dialogue__offer-text">{l(quest.offerText)}</p>
                <div className="npc-dialogue__offer-actions">
                  <Button
                    size="lg"
                    iconEnd="forward"
                    onClick={() => {
                      onAccept();
                    }}
                  >
                    {t('quest.accept')}
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    {t('quest.notNow')}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Already active — skip re-offering */}
            {atOffer && isActive && (
              <motion.div
                className="npc-dialogue__offer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="npc-dialogue__offer-text">
                  {l({ en: 'Your quest is underway! Keep going.', ar: 'مهمتك جارية! استمر.' })}
                </p>
                <Button iconEnd="forward" onClick={onClose}>
                  {t('a.continue')}
                </Button>
              </motion.div>
            )}

            {/* Already completed */}
            {atOffer && isCompleted && (
              <motion.div
                className="npc-dialogue__offer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="npc-dialogue__offer-text">
                  {l({ en: 'You've already lit every lantern — well done!', ar: 'لقد أضأت كل الفوانيس — أحسنت!' })}
                </p>
                <Button iconEnd="forward" onClick={onClose}>
                  {t('a.continue')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Choices */}
          {!isRevealing && !atOffer && line.choices && line.choices.length > 0 && (
            <div className="npc-dialogue__choices" onClick={(e) => e.stopPropagation()}>
              {line.choices.map((choice) => (
                <button
                  key={choice.next}
                  type="button"
                  className={`npc-dialogue__choice npc-dialogue__choice--${choice.tone ?? 'neutral'}`}
                  onClick={() => goTo(choice.next)}
                >
                  {l(choice.label)}
                </button>
              ))}
            </div>
          )}

          {/* Linear continue */}
          {!isRevealing && !atOffer && !line.choices?.length && (
            <button
              ref={continueRef}
              type="button"
              className="npc-dialogue__continue"
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
            >
              {line.next ? t('a.next') : t('a.close')} ›
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Close button */}
      <div className="npc-dialogue__close">
        <IconButton icon="close" label={t('a.close')} tone="glass" size="sm" onClick={onClose} />
      </div>
    </div>
  );
}
