/**
 * QURAN ODYSSEY · Interactive Quran Learning Experience
 *
 * Surah Al-Fatiha: Authentic Uthmani text, interactive word-by-word vocabulary,
 * Ayah Builder educational puzzle, and classical Tafsir contemplation.
 * Religious safeguards: Clearly disclosed demo review status with cited sources.
 *
 * AUDIO INTEGRITY NOTE: This feature does NOT contain recorded Quran recitation.
 * No audio synthesis is used for Quranic verses. Recitation playback requires
 * a verified recording, confirmed reciter identity, and proper licensing before
 * it can be enabled. The listen/recitation button is intentionally disabled.
 */
import { useState, useEffect } from 'react';
import { Button, DemoNote, Chip, Bar } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Page } from '@/app/Page';
import { SURAH_AL_FATIHA, FATIHA_VOCAB_CHALLENGES, FATIHA_BUILDER_PUZZLES } from './data/fatiha';
import type { QuranWord, QuranAyah } from './types';
import './quran.css';

type Mode = 'mushaf' | 'vocab' | 'builder' | 'tafsir';

export default function QuranOdyssey() {
  const { t, l, num } = useI18n();
  const surah = SURAH_AL_FATIHA;

  const [mode, setMode] = useState<Mode>('mushaf');
  const [selectedWord, setSelectedWord] = useState<QuranWord | null>(null);
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(1);

  // Vocab Challenge state
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabAnswer, setVocabAnswer] = useState<{ id: string; correct: boolean } | null>(null);
  const [vocabScore, setVocabScore] = useState(0);
  const [showVocabHint, setShowVocabHint] = useState(false);

  // Ayah Builder state
  const [builderIndex, setBuilderIndex] = useState(0);
  const activePuzzle = FATIHA_BUILDER_PUZZLES[builderIndex];
  const [placedWords, setPlacedWords] = useState<typeof activePuzzle.scrambledWords>([]);
  const [bankWords, setBankWords] = useState<typeof activePuzzle.scrambledWords>(activePuzzle.scrambledWords);
  const [builderComplete, setBuilderComplete] = useState(false);
  const [builderOrderWrong, setBuilderOrderWrong] = useState(false);

  // Reset builder state when puzzle changes
  useEffect(() => {
    setPlacedWords([]);
    setBankWords(activePuzzle.scrambledWords);
    setBuilderComplete(false);
    setBuilderOrderWrong(false);
  }, [builderIndex, activePuzzle]);

  const handleWordSelect = (word: QuranWord, ayah: QuranAyah) => {
    setSelectedWord(selectedWord?.id === word.id ? null : word);
    setActiveAyahNumber(ayah.number);
  };

  // ── NOTE: No audio playback is implemented in this version.
  // Quran recitation requires a verified recording with confirmed reciter
  // identity, verse-level alignment, and confirmed licensing before it
  // can be presented to learners. The listen button is intentionally disabled.

  // Vocab choice selection
  const handleVocabChoice = (opt: { id: string; correct: boolean }) => {
    if (vocabAnswer) return;
    setVocabAnswer(opt);
    if (opt.correct) {
      setVocabScore((s) => s + 1);
    }
  };

  const nextVocabQuestion = () => {
    setVocabAnswer(null);
    setShowVocabHint(false);
    setVocabIndex((idx) => (idx + 1) % FATIHA_VOCAB_CHALLENGES.length);
  };

  // Builder actions
  const handlePlaceWord = (word: (typeof activePuzzle.scrambledWords)[0]) => {
    if (builderComplete) return;
    const nextPlaced = [...placedWords, word];
    const nextBank = bankWords.filter((w) => w.id !== word.id);
    setPlacedWords(nextPlaced);
    setBankWords(nextBank);
    setBuilderOrderWrong(false);

    // Check if fully placed — only mark complete if order is correct
    if (nextPlaced.length === activePuzzle.scrambledWords.length) {
      const isCorrect = nextPlaced.every((w, idx) => w.correctIndex === idx);
      if (isCorrect) {
        setBuilderComplete(true);
      } else {
        setBuilderOrderWrong(true);
      }
    }
  };

  const handleRemoveWord = (word: (typeof activePuzzle.scrambledWords)[0]) => {
    if (builderComplete) return;
    setPlacedWords(placedWords.filter((w) => w.id !== word.id));
    setBankWords([...bankWords, word]);
    setBuilderOrderWrong(false);
  };

  const nextBuilderPuzzle = () => {
    setBuilderIndex((idx) => (idx + 1) % FATIHA_BUILDER_PUZZLES.length);
  };

  const resetBuilder = () => {
    setPlacedWords([]);
    setBankWords(activePuzzle.scrambledWords);
    setBuilderComplete(false);
    setBuilderOrderWrong(false);
  };

  return (
    <Page eyebrow={t('nav.quran' as unknown as 'nav.journey')} title={l(surah.name)} sub={l(surah.titleMeaning)}>
      <div className="quran-page">
        {/* Religious Content Review Safeguard */}
        <div style={{ marginBottom: '20px' }}>
          <DemoNote>{t('quran.reviewDisclaimer' as unknown as 'state.demoContentLong')}</DemoNote>
        </div>

        {/* Surah Header Card */}
        <header className="quran-header-card">
          <div className="row wrap justify-between items-center" style={{ gap: '12px' }}>
            <span className="quran-surah-badge">
              <Icon name="star" size={14} />
              {t('quran.surah' as unknown as 'app.name')} {num(surah.number)} · {t(`quran.${surah.revelationPlace}` as unknown as 'app.name')}
            </span>
            <Chip tone="quiet">
              {num(surah.ayahsCount)} {t('quran.ayahs' as unknown as 'app.name')}
            </Chip>
          </div>

          <div className="quran-surah-title">
            <h1 className="quran-arabic-title">{surah.name.ar}</h1>
            <p className="quran-english-title">{surah.titleMeaning.en}</p>
          </div>

          <p style={{ color: 'var(--slate-400)', fontSize: 'var(--fs-small)', marginTop: '8px' }}>
            {l(surah.description)}
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav className="quran-nav-tabs" role="tablist" aria-label="Quran Study Modes">
          <button
            role="tab"
            aria-selected={mode === 'mushaf'}
            className={`quran-tab-btn ${mode === 'mushaf' ? 'active' : ''}`}
            onClick={() => setMode('mushaf')}
          >
            <Icon name="quran" size={16} />
            <span>{t('quran.tabMushaf' as unknown as 'a.open')}</span>
          </button>
          <button
            role="tab"
            aria-selected={mode === 'vocab'}
            className={`quran-tab-btn ${mode === 'vocab' ? 'active' : ''}`}
            onClick={() => setMode('vocab')}
          >
            <Icon name="sparkle" size={16} />
            <span>{t('quran.tabVocab' as unknown as 'a.open')}</span>
          </button>
          <button
            role="tab"
            aria-selected={mode === 'builder'}
            className={`quran-tab-btn ${mode === 'builder' ? 'active' : ''}`}
            onClick={() => setMode('builder')}
          >
            <Icon name="layers" size={16} />
            <span>{t('quran.tabBuilder' as unknown as 'a.open')}</span>
          </button>
          <button
            role="tab"
            aria-selected={mode === 'tafsir'}
            className={`quran-tab-btn ${mode === 'tafsir' ? 'active' : ''}`}
            onClick={() => setMode('tafsir')}
          >
            <Icon name="info" size={16} />
            <span>{t('quran.tabTafsir' as unknown as 'a.open')}</span>
          </button>
        </nav>

        {/* ── MODE 1: MUSHAF & INTERACTIVE WORD EXPLORER ── */}
        {mode === 'mushaf' && (
          <section className="mushaf-card" aria-label="Surah Al-Fatiha Mushaf">
            <div className="bismillah-cartouche">
              <div className="mushaf-bismillah-arabic">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
            </div>

            <div className="ayah-container">
              {surah.ayahs.map((ayah) => {
                const isActive = activeAyahNumber === ayah.number;

                return (
                  <article
                    key={ayah.number}
                    className={`ayah-card ${isActive ? 'active-ayah' : ''}`}
                    onClick={() => setActiveAyahNumber(ayah.number)}
                  >
                    <header className="ayah-header">
                      <span className="ayah-number-badge" aria-label={`Ayah ${ayah.number}`}>
                        {num(ayah.number)}
                      </span>
                      {/* Audio intentionally unavailable — requires verified recitation recording */}
                      <span
                        className="ayah-audio-btn ayah-audio-unavailable"
                        aria-label={t('quran.listenUnavailable' as unknown as 'app.name')}
                        title={t('quran.listenUnavailableTitle' as unknown as 'app.name')}
                      >
                        <Icon name="mic" size={14} />
                        <span>{t('quran.listenUnavailable' as unknown as 'app.name')}</span>
                      </span>
                    </header>

                    {/* Word-by-word interactive Arabic text */}
                    <div className="ayah-arabic-flow">
                      {ayah.words.map((w) => {
                        const isWordSelected = selectedWord?.id === w.id;
                        return (
                          <span
                            key={w.id}
                            className={`quran-word-interactive ${isWordSelected ? 'selected-word' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWordSelect(w, ayah);
                            }}
                            title={`${w.transliteration} · ${l(w.translation)}`}
                          >
                            {w.arabic}
                          </span>
                        );
                      })}
                      <span className="ayah-medallion" aria-label={`Ayah ${ayah.number}`}>
                        {num(ayah.number)}
                      </span>
                    </div>

                    <div className="ayah-translation-en">{l(ayah.translation)}</div>
                    <div className="ayah-transliteration">{ayah.transliteration}</div>

                    {/* Word Inspector popover if word in this ayah is selected */}
                    {selectedWord && selectedWord.id.startsWith(`1:${ayah.number}:`) && (
                      <div className="word-inspector-card">
                        <div className="word-inspector-header">
                          <div className="row items-center gap-2">
                            <span className="word-inspector-arabic">{selectedWord.arabic}</span>
                            <Chip tone="gold">{selectedWord.transliteration}</Chip>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWord(null);
                            }}
                            className="ayah-audio-btn"
                            aria-label={t('a.close')}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </div>
                        <div className="word-meta-grid">
                          <div className="word-meta-item">
                            <span className="word-meta-label">{t('quran.meaning' as unknown as 'app.name')}</span>
                            <span className="word-meta-value">{l(selectedWord.translation)}</span>
                          </div>
                          <div className="word-meta-item">
                            <span className="word-meta-label">{t('quran.root' as unknown as 'app.name')}</span>
                            <span className="word-meta-value">{selectedWord.root ? `[ ${selectedWord.root} ]` : '—'}</span>
                          </div>
                          <div className="word-meta-item">
                            <span className="word-meta-label">{t('quran.grammar' as unknown as 'app.name')}</span>
                            <span className="word-meta-value">{l(selectedWord.grammar)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ── MODE 2: VOCABULARY TREASURE CHALLENGE ── */}
        {mode === 'vocab' && (
          <section className="vocab-studio-panel" aria-label="Quranic Vocabulary Studio">
            {(() => {
              const currentQ = FATIHA_VOCAB_CHALLENGES[vocabIndex];
              const progressRatio = (vocabIndex + 1) / FATIHA_VOCAB_CHALLENGES.length;

              return (
                <div className="vocab-quiz-card">
                  <div className="row justify-between items-center" style={{ marginBottom: '16px' }}>
                    <Chip tone="quiet">
                      {t('quran.wordChallenge' as unknown as 'app.name')} {num(vocabIndex + 1)} / {num(FATIHA_VOCAB_CHALLENGES.length)}
                    </Chip>
                    <Chip tone="gold">
                      {t('quran.score' as unknown as 'app.name')}: {num(vocabScore)}
                    </Chip>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <Bar value={progressRatio} gold label={t('quran.wordChallenge' as unknown as 'app.name')} />
                  </div>

                  <p style={{ color: 'var(--slate-400)', fontSize: 'var(--fs-small)' }}>
                    {t('quran.vocabPrompt' as unknown as 'app.name')}
                  </p>

                  <div className="vocab-prompt-arabic">{currentQ.word.arabic}</div>

                  {currentQ.word.root && (
                    <div className="vocab-prompt-root">
                      {t('quran.root' as unknown as 'app.name')}: {currentQ.word.root} ({currentQ.word.transliteration})
                    </div>
                  )}

                  <div className="vocab-options-grid">
                    {currentQ.options.map((opt) => {
                      const isChosen = vocabAnswer?.id === opt.id;
                      const showResult = vocabAnswer !== null;
                      let statusClass = '';
                      if (showResult) {
                        if (opt.correct) statusClass = 'correct';
                        else if (isChosen) statusClass = 'wrong';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`vocab-option-btn ${statusClass}`}
                          disabled={vocabAnswer !== null}
                          onClick={() => handleVocabChoice(opt)}
                        >
                          <span>{l(opt.text)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback and next button */}
                  <div className="row wrap justify-between items-center" style={{ marginTop: '16px' }}>
                    {!vocabAnswer && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowVocabHint(!showVocabHint)}
                      >
                        <Icon name="lantern" size={16} />
                        {showVocabHint ? t('a.close') : t('m.hint' as unknown as 'a.open')}
                      </Button>
                    )}

                    {showVocabHint && (
                      <p style={{ color: 'var(--gold-300)', fontSize: 'var(--fs-caption)', width: '100%', margin: '8px 0' }}>
                        💡 {l(currentQ.hint)}
                      </p>
                    )}

                    {vocabAnswer && (
                      <div className="row items-center gap-2" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <span style={{ color: vocabAnswer.correct ? 'var(--emerald-500)' : 'var(--gold-300)', fontWeight: 600 }}>
                          {vocabAnswer.correct ? `✨ ${t('quran.wellDone' as unknown as 'a.done')}` : `📖 ${l(currentQ.hint)}`}
                        </span>
                        <Button variant="primary" onClick={nextVocabQuestion}>
                          {t('a.next')} <Icon name="forward" size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ── MODE 3: AYAH BUILDER PUZZLE ── */}
        {mode === 'builder' && (
          <section className="builder-panel" aria-label="Ayah Builder Activity">
            <div className="vocab-quiz-card">
              <div className="row justify-between items-center" style={{ marginBottom: '16px' }}>
                <Chip tone="gold">
                  {t('quran.reconstructAyah' as unknown as 'app.name')} {num(activePuzzle.ayahNumber)} / {num(FATIHA_BUILDER_PUZZLES.length)}
                </Chip>
                <Button variant="secondary" size="sm" onClick={resetBuilder}>
                  <Icon name="refresh" size={14} /> {t('a.retry')}
                </Button>
              </div>

              <p style={{ color: 'var(--sand-100)', fontSize: 'var(--fs-body)', marginBottom: '16px', fontStyle: 'italic' }}>
                "{l(activePuzzle.translation)}"
              </p>

              {/* Attempt Zone — clearly labeled as learner arrangement, NOT authentic Quranic text */}
              <div className="builder-attempt-label">
                <Icon name="layers" size={12} />
                <span>{t('quran.yourAttempt' as unknown as 'app.name')}</span>
                <span className="builder-attempt-note">{t('quran.attemptNote' as unknown as 'app.name')}</span>
              </div>
              <div className={`builder-drop-zone ${builderComplete ? 'completed' : ''} ${builderOrderWrong ? 'order-wrong' : ''}`}>
                {placedWords.length === 0 ? (
                  <span style={{ color: 'var(--slate-400)', fontSize: 'var(--fs-small)' }}>
                    {t('quran.tapWordsInstruction' as unknown as 'app.name')}
                  </span>
                ) : (
                  placedWords.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className="builder-word-slot"
                      onClick={() => handleRemoveWord(w)}
                      title={t('a.undo')}
                    >
                      <span>{w.arabic}</span>
                    </button>
                  ))
                )}
                {placedWords.length > 0 && placedWords.length < activePuzzle.scrambledWords.length && (
                  <span style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-caption)', alignSelf: 'center' }}>
                    ({num(activePuzzle.scrambledWords.length - placedWords.length)} {t('quran.remainingWords' as unknown as 'app.name')})
                  </span>
                )}
              </div>

              {/* Wrong order feedback — clarify this is not the Quranic verse */}
              {builderOrderWrong && !builderComplete && (
                <div className="builder-wrong-order-notice">
                  <Icon name="info" size={14} />
                  <span>{t('quran.wrongOrder' as unknown as 'app.name')}</span>
                </div>
              )}

              {/* Bank of remaining scrambled words */}
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-caption)', marginBottom: '10px' }}>
                  {t('quran.wordBank' as unknown as 'app.name')}
                </p>
                <div className="builder-bank">
                  {bankWords.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className="builder-chip-btn"
                      onClick={() => handlePlaceWord(w)}
                    >
                      {w.arabic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Victory state — shows the verified source text as reference */}
              {builderComplete && (
                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(34, 176, 140, 0.15)', border: '1px solid var(--emerald-500)', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--emerald-500)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '8px' }}>
                    ✨ {t('quran.ayahCompleted' as unknown as 'a.done')}
                  </div>
                  {/* Verified source text — displayed after correct completion for reference only */}
                  <p style={{ color: 'var(--slate-400)', fontSize: 'var(--fs-caption)', marginBottom: '4px' }}>
                    {t('quran.verifiedSourceText' as unknown as 'app.name')}
                  </p>
                  <p style={{ color: 'var(--ivory-50)', fontFamily: 'Amiri, serif', fontSize: '1.8rem', lineHeight: '2' }}>
                    {activePuzzle.targetArabic}
                  </p>
                  <div style={{ marginTop: '16px' }}>
                    <Button variant="primary" onClick={nextBuilderPuzzle}>
                      {t('quran.nextAyah' as unknown as 'a.next')} <Icon name="forward" size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── MODE 4: TAFSIR & REFLECTION ── */}
        {mode === 'tafsir' && (
          <section aria-label="Tafsir & Reflections">
            {/* Scholarly review notice for Tafsir content */}
            <div className="tafsir-review-notice">
              <Icon name="seal" size={14} />
              <span>{t('quran.tafsirReviewNotice' as unknown as 'app.name')}</span>
            </div>
            {surah.ayahs.map((ayah) => (
              <article key={ayah.number} className="reflection-card">
                <div className="reflection-theme-badge">
                  <Icon name="sparkle" size={14} />
                  <span>Ayah {num(ayah.number)} · {l(ayah.reflectionTheme)}</span>
                </div>
                <div style={{ fontFamily: 'Amiri, serif', fontSize: '1.4rem', color: 'var(--gold-300)', marginBottom: '10px', direction: 'rtl' }}>
                  {ayah.arabic}
                </div>
                <p className="reflection-tafsir-text">{l(ayah.tafsir)}</p>
                {/* Unverified flag — pending scholar board approval */}
                <div className="reflection-unverified-badge">
                  <Icon name="info" size={12} />
                  <span>{t('quran.tafsirUnverified' as unknown as 'app.name')}</span>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Sources and Trust Footer */}
        <footer className="quran-trust-footer">
          <div className="row items-center gap-2" style={{ marginBottom: '8px' }}>
            <Icon name="seal" size={16} />
            <strong>{t('quran.sourcesTitle' as unknown as 'app.name')}</strong>
          </div>
          <p style={{ margin: '4px 0' }}>
            • <strong>{t('quran.mushafSource' as unknown as 'app.name')}:</strong> {surah.sources.mushaf}
          </p>
          <p style={{ margin: '4px 0' }}>
            • <strong>{t('quran.translationSource' as unknown as 'app.name')}:</strong> {surah.sources.translation}
          </p>
          <p style={{ margin: '4px 0' }}>
            • <strong>{t('quran.tafsirSource' as unknown as 'app.name')}:</strong> {surah.sources.tafsir}
          </p>
          <p style={{ margin: '4px 0', color: 'var(--gold-300)' }}>
            • {surah.sources.verificationNotice}
          </p>
        </footer>
      </div>
    </Page>
  );
}
