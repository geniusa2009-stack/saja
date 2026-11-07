/**
 * QuestRunner — the top-level quest orchestrator.
 *
 * Flow:
 *   1. Player taps Amina in the world → <NpcDialogue> opens
 *   2. Player accepts quest → status becomes 'active'
 *   3. <ClueDiscovery> overlay is shown on the mission scene
 *   4. Once all clues are found → mission unlocked
 *   5. Player completes the mission → quest completes via MissionSync callback
 *   6. Completion event emitted → 3D world can listen via onQuestEvent
 *
 * This component only controls the QUEST layer.
 * The existing MissionRunner handles mission execution and server-authoritative
 * completion; QuestRunner listens to the progress store and bridges the two.
 */
import { useCallback, useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '@/store/progress';
import { useQuests } from '@/store/quests';
import { toast } from '@/design-system';
import { useI18n } from '@/i18n';
import type { QuestDef } from './types';
import { NpcDialogue } from './NpcDialogue';
import { ClueDiscovery } from './ClueDiscovery';
import { QuestJournal } from './QuestJournal';
import './quest-runner.css';

interface Props {
  quest: QuestDef;
  /** The learner is talking to the quest's NPC: open the dialogue. */
  open?: boolean;
  /** Called when the dialogue panel should be closed (e.g. player walks away). */
  onDismiss?: () => void;
}

/** Phase the quest UI is currently showing. */
type Phase =
  | 'idle'          // NPC in world, nothing open
  | 'dialogue'      // Talking to the NPC
  | 'clue-hunt'     // Active quest, exploring for clues
  | 'journal'       // Journal panel open
  | 'complete';     // Quest done, fanfare

export function QuestRunner({ quest, open = false, onDismiss }: Props) {
  const { l, t } = useI18n();
  const navigate = useNavigate();
  const acceptQuest = useQuests((s) => s.acceptQuest);
  const completeQuest = useQuests((s) => s.completeQuest);
  const completeObjective = useQuests((s) => s.completeObjective);
  const results = useProgress((s) => s.results);

  const questState = useQuests((s) => s.quests[quest.id]);
  const status = questState?.status ?? 'available';
  // Mounted with the world: an accepted quest resumes its clue hunt; otherwise nothing shows until the NPC is spoken to.
  const [phase, setPhase] = useState<Phase>(() => (open ? 'dialogue' : status === 'active' ? 'clue-hunt' : 'idle'));
  useEffect(() => {
    if (open) setPhase('dialogue');
  }, [open]);
  const foundClues = questState?.foundClues ?? [];
  const completedObjectives = useMemo(() => questState?.completedObjectives ?? [], [questState?.completedObjectives]);
  const allCluesFound = foundClues.length >= quest.clues.length;
  // The last clue's card must stay readable: the hunt ends once that card is closed, not on the tap that found it.
  const [lastCardRead, setLastCardRead] = useState(allCluesFound);

  // Watch for mission completion and auto-complete the quest objective + quest itself.
  useEffect(() => {
    if (status !== 'active') return;
    const missionDone = !!results[quest.missionId];
    if (!missionDone) return;

    // Complete the mission-completion objective.
    const missionObj = quest.objectives.find(
      (o) => o.kind.type === 'complete-mission' && o.kind.missionId === quest.missionId,
    );
    if (missionObj && !completedObjectives.includes(missionObj.id)) {
      completeObjective(quest.id, missionObj.id);
    }

    // If every objective is now done, close the quest.
    const allDone = quest.objectives.every(
      (o) =>
        completedObjectives.includes(o.id) ||
        (o.kind.type === 'complete-mission' && o.kind.missionId === quest.missionId),
    );
    if (allDone) {
      completeQuest(quest.id);
      setPhase('complete');
    }
  }, [results, quest, status, completedObjectives, completeObjective, completeQuest]);

  // The ready panel below already explains the next mission step.
  // Avoid a duplicate transient toast that can obscure NPC dialogue on mobile.

  const handleAccept = useCallback(() => {
    acceptQuest(quest.id);
    setPhase('clue-hunt');
    toast(l({ en: 'Quest accepted! Explore the village.', ar: 'قبلت المهمة! استكشف القرية.' }));
    onDismiss?.();
  }, [acceptQuest, quest.id, l, onDismiss]);

  const handleDialogueClose = useCallback(() => {
    if (status === 'active') {
      setPhase('clue-hunt');
    } else {
      setPhase('idle');
    }
    onDismiss?.();
  }, [status, onDismiss]);

  const handleStartMission = useCallback(() => {
    navigate(`/mission/${quest.missionId}`);
  }, [navigate, quest.missionId]);

  return (
    <>
      <AnimatePresence>
        {/* Step 1: Dialogue */}
        {phase === 'dialogue' && (
          <NpcDialogue
            key="dialogue"
            quest={quest}
            onClose={handleDialogueClose}
            onAccept={handleAccept}
          />
        )}

        {/* Step 2: Clue hunt overlay (shown when quest is active and clues remain) */}
        {phase === 'clue-hunt' && (!allCluesFound || !lastCardRead) && (
          <motion.div
            key="clue-hunt"
            className="quest-runner__clue-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClueDiscovery quest={quest} onCardClosed={() => setLastCardRead(useQuests.getState().quests[quest.id]?.foundClues.length === quest.clues.length)} />
            {/* Minimal HUD: quest name + journal button */}
            <QuestHud
              quest={quest}
              foundClues={foundClues.length}
              totalClues={quest.clues.length}
              onJournal={() => setPhase('journal')}
            />
          </motion.div>
        )}

        {/* Step 2b: All clues found — show "Go to mission" prompt */}
        {phase === 'clue-hunt' && allCluesFound && lastCardRead && !results[quest.missionId] && (
          <motion.div
            key="ready"
            className="quest-runner__ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="quest-runner__ready-text">
              {l({ en: 'All three clues found! Now light the lanterns.', ar: 'وجدت الأدلة الثلاثة! الآن أضئ الفوانيس.' })}
            </p>
            <div className="quest-runner__ready-actions">
              <button
                type="button"
                className="quest-runner__mission-btn"
                onClick={handleStartMission}
              >
                {l({ en: 'Begin: Words of Peace', ar: 'ابدأ: كلمات السلام' })} ›
              </button>
              <button
                type="button"
                className="quest-runner__journal-link"
                onClick={() => setPhase('journal')}
              >
                {t('quest.journal')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Journal */}
        {phase === 'journal' && (
          <QuestJournal key="journal" onClose={() => setPhase(status === 'active' ? 'clue-hunt' : 'idle')} />
        )}

        {/* Completion fanfare */}
        {phase === 'complete' && (
          <QuestComplete
            key="complete"
            quest={quest}
            onClose={() => {
              setPhase('idle');
              onDismiss?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Persistent journal button when quest is active and nothing else is open */}
      {phase === 'idle' && status === 'active' && (
        <button
          type="button"
          className="quest-runner__journal-fab"
          onClick={() => setPhase('journal')}
          aria-label={t('quest.journal')}
        >
          📖
        </button>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function QuestHud({
  quest,
  foundClues,
  totalClues,
  onJournal,
}: {
  quest: QuestDef;
  foundClues: number;
  totalClues: number;
  onJournal: () => void;
}) {
  const { l, t } = useI18n();
  return (
    <div className="quest-hud">
      <div className="quest-hud__info">
        <span className="quest-hud__title">{l(quest.title)}</span>
        <span className="quest-hud__count">
          {t('quest.cluesFound', { n: foundClues, total: totalClues })}
        </span>
      </div>
      <button
        type="button"
        className="quest-hud__journal-btn"
        onClick={onJournal}
        aria-label={t('quest.journal')}
      >
        📖
      </button>
    </div>
  );
}

function QuestComplete({ quest, onClose }: { quest: QuestDef; onClose: () => void }) {
  const { l, t } = useI18n();
  return (
    <motion.div
      className="quest-complete"
      role="dialog"
      aria-modal="true"
      aria-label={t('quest.completed')}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="quest-complete__backdrop" />
      <div className="quest-complete__card">
        <motion.div
          className="quest-complete__stars"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          aria-hidden
        >
          ✦ ✦ ✦
        </motion.div>
        <h2 className="quest-complete__title">{l(quest.title)}</h2>
        <p className="quest-complete__fanfare">{l(quest.reward.fanfare)}</p>
        <button type="button" className="quest-complete__cta" onClick={onClose}>
          {t('a.continue')} ›
        </button>
      </div>
    </motion.div>
  );
}
