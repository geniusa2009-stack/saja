/**
 * Quest Journal — a slide-up panel showing active objectives and completed ones.
 *
 * - Groups quests by status: Active / Completed
 * - Each active quest shows its objectives with check states
 * - Contextual hints are shown on demand (one at a time)
 * - Fully bilingual (AR/EN)
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IconButton } from '@/design-system';
import { useI18n } from '@/i18n';
import { useQuests } from '@/store/quests';
import { QUEST_BY_ID } from './definitions';
import type { QuestDef, QuestState } from './types';
import './quest-journal.css';

interface Props {
  onClose: () => void;
}

export function QuestJournal({ onClose }: Props) {
  const { l, t } = useI18n();
  const questsState = useQuests((s) => s.quests);
  const useHint = useQuests((s) => s.useHint);
  const [openQuestId, setOpenQuestId] = useState<string | null>(null);

  const allStates = Object.values(questsState);
  const active = allStates.filter((q) => q.status === 'active');
  const completed = allStates.filter((q) => q.status === 'completed');

  // Expand the first active quest by default.
  const effectiveOpen = openQuestId ?? active[0]?.questId ?? null;

  return (
    <div
      className="quest-journal"
      role="dialog"
      aria-modal="true"
      aria-label={t('quest.journal')}
    >
      <div className="quest-journal__backdrop" onClick={onClose} />

      <motion.div
        className="quest-journal__panel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      >
        <header className="quest-journal__header">
          <div className="quest-journal__header-inner">
            <span className="quest-journal__icon" aria-hidden>📖</span>
            <h2 className="quest-journal__title">{t('quest.journal')}</h2>
          </div>
          <IconButton icon="close" label={t('a.close')} tone="plain" onClick={onClose} />
        </header>

        <div className="quest-journal__body">
          {active.length === 0 && completed.length === 0 && (
            <p className="quest-journal__empty">
              {l({ en: 'No quests yet. Talk to someone in the world — they might have a task for you.', ar: 'لا مهام بعد. تحدث إلى شخص ما في العالم — ربما لديه مهمة لك.' })}
            </p>
          )}

          {active.length > 0 && (
            <section className="quest-journal__section">
              <h3 className="quest-journal__section-title">{t('quest.active')}</h3>
              {active.map((qs) => {
                const def = QUEST_BY_ID[qs.questId];
                if (!def) return null;
                const isOpen = effectiveOpen === qs.questId;
                return (
                  <QuestCard
                    key={qs.questId}
                    def={def}
                    state={qs}
                    isOpen={isOpen}
                    onToggle={() => setOpenQuestId(isOpen ? null : qs.questId)}
                    onHint={() => useHint(qs.questId)}
                  />
                );
              })}
            </section>
          )}

          {completed.length > 0 && (
            <section className="quest-journal__section">
              <h3 className="quest-journal__section-title">{t('quest.completed')}</h3>
              {completed.map((qs) => {
                const def = QUEST_BY_ID[qs.questId];
                if (!def) return null;
                return (
                  <div key={qs.questId} className="quest-journal__card quest-journal__card--done">
                    <span className="quest-journal__card-check" aria-hidden>✦</span>
                    <div>
                      <div className="quest-journal__card-name">{l(def.title)}</div>
                      <div className="quest-journal__card-fanfare">{l(def.reward.fanfare)}</div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface CardProps {
  def: QuestDef;
  state: QuestState;
  isOpen: boolean;
  onToggle: () => void;
  onHint: () => void;
}

function QuestCard({ def, state, isOpen, onToggle, onHint }: CardProps) {
  const { l, t } = useI18n();
  const nextHintIdx = Math.min(state.hintsUsed, def.hints.length - 1);
  const hint = def.hints[nextHintIdx];
  const allDone = state.completedObjectives.length === def.objectives.length;

  return (
    <div className="quest-journal__card" data-open={isOpen || undefined}>
      <button
        type="button"
        className="quest-journal__card-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="quest-journal__card-meta">
          <span className="quest-journal__card-name">{l(def.title)}</span>
          <span className="quest-journal__card-progress">
            {state.completedObjectives.length}/{def.objectives.length}
          </span>
        </div>
        <span className="quest-journal__card-chevron" aria-hidden>
          {isOpen ? '▾' : '▸'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="quest-journal__card-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="quest-journal__entry">{l(def.journalEntry)}</p>

            <ul className="quest-journal__objectives" role="list">
              {def.objectives.map((obj) => {
                const done = state.completedObjectives.includes(obj.id);
                return (
                  <li
                    key={obj.id}
                    className={`quest-journal__objective ${done ? 'is-done' : ''}`}
                    aria-label={`${l(obj.label)} — ${done ? t('quest.objDone') : t('quest.objPending')}`}
                  >
                    <span className="quest-journal__obj-check" aria-hidden>
                      {done ? '✓' : '○'}
                    </span>
                    <span className="quest-journal__obj-label">{l(obj.label)}</span>
                  </li>
                );
              })}
            </ul>

            {!allDone && hint && (
              <div className="quest-journal__hint-row">
                <button
                  type="button"
                  className="quest-journal__hint-btn"
                  onClick={onHint}
                >
                  ✦ {t('quest.hint')}
                </button>
                <AnimatePresence>
                  {state.hintsUsed > 0 && (
                    <motion.p
                      key={nextHintIdx}
                      className="quest-journal__hint-text"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {l(hint)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
