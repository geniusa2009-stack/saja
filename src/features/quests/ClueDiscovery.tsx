/**
 * Clue Discovery Overlay
 *
 * Renders glowing interactive clue spots over a scene.
 * When the player taps a clue:
 *   1. The clue reveals its fragment with an animation
 *   2. The quest store records the discovery
 *   3. The objective is auto-completed in the store
 *
 * This component is modular — it sits above whatever scene
 * is being rendered (mission stage, world, etc.).
 * The 3D world can consume the same store data to place
 * interactable objects in Three.js.
 */
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { useQuests } from '@/store/quests';
import type { QuestClue, QuestDef } from './types';
import './clue-discovery.css';

/** Stable empty list: a fresh [] in a selector is a new snapshot on every render. */
const NONE: string[] = [];

interface Props {
  quest: QuestDef;
  /** A clue card was closed (the learner has read it). */
  onCardClosed?: () => void;
}

export function ClueDiscovery({ quest, onCardClosed }: Props) {
  const { l, t } = useI18n();
  const foundClues = useQuests((s) => s.quests[quest.id]?.foundClues ?? NONE);
  const discoverClue = useQuests((s) => s.discoverClue);
  const [activeClue, setActiveClue] = useState<string | null>(null);

  const handleClueClick = useCallback(
    (clue: QuestClue) => {
      if (!foundClues.includes(clue.id)) {
        discoverClue(quest.id, clue.id);
      }
      setActiveClue((cur) => (cur === clue.id ? null : clue.id));
    },
    [foundClues, discoverClue, quest.id],
  );

  const undiscovered = quest.clues.filter((c) => !foundClues.includes(c.id));
  const discovered = quest.clues.filter((c) => foundClues.includes(c.id));

  return (
    <div className="clue-discovery" aria-label={t('quest.clueArea')}>
      {/* Undiscovered: pulsing glow spots */}
      {undiscovered.map((clue) => (
        <button
          key={clue.id}
          type="button"
          className="clue-spot clue-spot--undiscovered"
          style={{ left: `${clue.position.x}%`, top: `${clue.position.y}%` }}
          aria-label={t('quest.discoverClue')}
          onClick={() => handleClueClick(clue)}
        >
          <span className="clue-spot__pulse" aria-hidden />
          <span className="clue-spot__core" aria-hidden>✦</span>
        </button>
      ))}

      {/* Discovered: dimmer but still visible, tap to re-read */}
      {discovered.map((clue) => (
        <button
          key={clue.id}
          type="button"
          className="clue-spot clue-spot--found"
          style={{ left: `${clue.position.x}%`, top: `${clue.position.y}%` }}
          aria-label={l(clue.object)}
          onClick={() => handleClueClick(clue)}
        >
          <span className="clue-spot__core clue-spot__core--found" aria-hidden>✦</span>
        </button>
      ))}

      {/* Clue fragment popup */}
      <AnimatePresence>
        {activeClue && (
          <>
            <div
              className="clue-popup-backdrop"
              onClick={() => setActiveClue(null)}
              aria-hidden
            />
            <CluePopup
              clue={quest.clues.find((c) => c.id === activeClue)!}
              isNew={!foundClues.slice(0, foundClues.indexOf(activeClue)).length && foundClues.includes(activeClue) && foundClues[foundClues.length - 1] === activeClue}
              onClose={() => {
                setActiveClue(null);
                onCardClosed?.();
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Progress is shown in the quest HUD; this announces each find to screen readers. */}
      {quest.clues.length > 0 && (
        <p className="sr-only" aria-live="polite" aria-atomic>
          {t('quest.cluesFound', { n: foundClues.length, total: quest.clues.length })}
        </p>
      )}
    </div>
  );
}

function CluePopup({ clue, isNew, onClose }: { clue: QuestClue; isNew: boolean; onClose: () => void }) {
  const { l, t } = useI18n();

  return (
    <motion.div
      className="clue-popup"
      role="dialog"
      aria-modal="true"
      aria-label={l(clue.object)}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      style={{
        left: `${Math.min(75, Math.max(5, clue.position.x))}%`,
        top: `${Math.min(70, Math.max(10, clue.position.y - 18))}%`,
      }}
    >
      {isNew && (
        <motion.div
          className="clue-popup__found-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
        >
          {t('quest.clueFound')} ✦
        </motion.div>
      )}
      <p className="clue-popup__object">{l(clue.object)}</p>
      <p className="clue-popup__fragment">{l(clue.fragment)}</p>
      <button type="button" className="clue-popup__close" onClick={onClose} aria-label={t('a.close')}>
        ×
      </button>
    </motion.div>
  );
}
