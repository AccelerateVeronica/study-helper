import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Layers, ListChecks, RotateCcw, Sparkles, X } from 'lucide-react';
import { flashcards } from './gh300Deck';

type ReviewState = Record<string, 'learned' | 'practice'>;
type StudyMode = 'flashcards' | 'quiz';
type SavedStudy = { currentIndex: number; review: ReviewState; mode: StudyMode };

const STORAGE_KEY = 'fieldnotes-study-session';

function readSavedStudy(): SavedStudy {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SavedStudy>;
      const review = Object.fromEntries(
        Object.entries(parsed.review ?? {}).filter(([id, status]) =>
          flashcards.some((card) => card.id === id) && (status === 'learned' || status === 'practice'),
        ),
      ) as ReviewState;
      const currentIndex = typeof parsed.currentIndex === 'number' && Number.isInteger(parsed.currentIndex)
        ? Math.max(0, Math.min(parsed.currentIndex, flashcards.length - 1))
        : 0;
      return { currentIndex, review, mode: parsed.mode === 'quiz' ? 'quiz' : 'flashcards' };
    }
  } catch {
    // Start with a fresh session if saved browser data is unavailable.
  }
  return { currentIndex: 0, review: {}, mode: 'flashcards' };
}

export default function App() {
  const [study, setStudy] = useState(readSavedStudy);
  const { currentIndex, review, mode } = study;
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [quizSelections, setQuizSelections] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const activeCard = flashcards[currentIndex];
  const quizFinished = activeCard.answers.length === 1
    ? quizSelections.length > 0
    : activeCard.answers.every((answer) => quizSelections.includes(answer))
      && quizSelections.every((choice) => activeCard.answers.includes(choice));
  const flashcardCorrect = activeCard.answers.every((answer) => selectedChoices.includes(answer))
    && selectedChoices.every((choice) => activeCard.answers.includes(choice));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(study));
  }, [study]);

  const learnedCount = Object.values(review).filter((status) => status === 'learned').length;
  const practiceCount = Object.values(review).filter((status) => status === 'practice').length;
  const progress = (Object.keys(review).length / flashcards.length) * 100;

  function advanceCard() {
    setStudy((current) => ({ ...current, currentIndex: (current.currentIndex + 1) % flashcards.length }));
    setSelectedChoices([]);
    setQuizSelections([]);
    setIsRevealed(false);
    setDragOffset(0);
  }

  function moveCard(direction: 'learned' | 'practice') {
    setStudy((current) => ({ ...current, review: { ...current.review, [activeCard.id]: direction } }));
    advanceCard();
  }

  function changeMode(nextMode: StudyMode) {
    setStudy((current) => ({ ...current, mode: nextMode }));
    setSelectedChoices([]);
    setQuizSelections([]);
    setIsRevealed(false);
  }

  function selectFlashcardChoice(choice: string) {
    setSelectedChoices((current) => activeCard.answers.length === 1
      ? [choice]
      : current.includes(choice) ? current.filter((selected) => selected !== choice) : [...current, choice]);
  }

  function selectQuizChoice(choice: string) {
    if (quizFinished) return;
    if (activeCard.answers.length === 1) {
      const isCorrect = activeCard.answers.includes(choice);
      setQuizSelections([choice]);
      setStudy((current) => ({
        ...current,
        review: { ...current.review, [activeCard.id]: isCorrect ? 'learned' : 'practice' },
      }));
      return;
    }

    const nextSelections = quizSelections.includes(choice)
      ? quizSelections.filter((selected) => selected !== choice)
      : [...quizSelections, choice];
    const isComplete = activeCard.answers.every((answer) => nextSelections.includes(answer))
      && nextSelections.every((selected) => activeCard.answers.includes(selected));
    setQuizSelections(nextSelections);
    setStudy((current) => ({
      ...current,
      review: { ...current.review, [activeCard.id]: isComplete ? 'learned' : 'practice' },
    }));
  }

  function resetSession() {
    setStudy((current) => ({ currentIndex: 0, review: {}, mode: current.mode }));
    setSelectedChoices([]);
    setQuizSelections([]);
    setIsRevealed(false);
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!isRevealed || mode !== 'flashcards') return;
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (pointerStart.current === null) return;
    setDragOffset(Math.max(-150, Math.min(150, event.clientX - pointerStart.current)));
  }

  function onPointerUp() {
    if (pointerStart.current === null) return;
    if (dragOffset > 85) moveCard('learned');
    else if (dragOffset < -85) moveCard('practice');
    else setDragOffset(0);
    pointerStart.current = null;
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (mode === 'flashcards' && event.key === 'ArrowRight' && isRevealed) moveCard('learned');
      if (mode === 'flashcards' && event.key === 'ArrowLeft' && isRevealed) moveCard('practice');
      if (event.key === 'Escape') setIsRevealed(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRevealed, mode]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#study" aria-label="Fieldnotes home">
          <span className="brand-mark"><span /></span>
          <span>fieldnotes</span>
        </a>
        <div className="topbar-right">
          <span className="session-label"><span className="live-dot" /> STUDY SESSION</span>
          <button className="icon-button reset-button" onClick={resetSession} aria-label="Reset study session" title="Reset session">
            <RotateCcw size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="study-layout" id="study">
        <aside className="study-sidebar" aria-label="Study progress">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR STUDY DESK</div>
          <h1>A little<br />closer to<br /><em>knowing.</em></h1>
          <p className="sidebar-copy">Small steps make<br />strong memories.</p>

          <div className="progress-block">
            <div className="progress-heading">
              <span>SESSION PROGRESS</span>
              <span>{Object.keys(review).length}<span className="progress-total"> / {flashcards.length}</span></span>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Session progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-stats">
              <span><Check size={14} /> {learnedCount} learned</span>
              <span><RotateCcw size={13} /> {practiceCount} to revisit</span>
            </div>
          </div>

          <div className="deck-note">
            <div className="deck-icon"><Sparkles size={16} /></div>
            <div>
              <span className="deck-title">GH-300 exam prep</span>
              <span className="deck-caption">Practice question bank</span>
            </div>
            <span className="deck-count">{String(flashcards.length).padStart(2, '0')}</span>
          </div>
        </aside>

        <section className="session-panel" aria-label="Flashcard study area">
          <div className="mode-switch" role="tablist" aria-label="Study mode">
            <button role="tab" aria-selected={mode === 'flashcards'} className={mode === 'flashcards' ? 'is-active' : ''} onClick={() => changeMode('flashcards')}>
              <Layers size={15} /> Flashcards
            </button>
            <button role="tab" aria-selected={mode === 'quiz'} className={mode === 'quiz' ? 'is-active' : ''} onClick={() => changeMode('quiz')}>
              <ListChecks size={15} /> Quiz
            </button>
          </div>
          <div className="session-heading">
            <div>
              <div className="session-kicker">CERTIFICATION REVIEW <span>/</span> {activeCard.subject.toUpperCase()}</div>
              <h2>{mode === 'quiz' ? 'Quick quiz' : 'Quick study'} <span>·</span> <b>{currentIndex + 1} of {flashcards.length}</b></h2>
            </div>
            <div className="card-count" aria-label={`Card ${currentIndex + 1} of ${flashcards.length}`}>
              <span className="count-current">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="count-divider">/</span>
              <span>{String(flashcards.length).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="card-stage">
            <div className="card-shadow card-shadow-back" />
            <article
              className={`flashcard ${isRevealed ? 'is-revealed' : ''} ${mode === 'quiz' ? 'quiz-card' : ''}`}
              style={{ transform: `translateX(${dragOffset}px) rotate(${dragOffset / 24}deg)` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-live="polite"
            >
              <div className="card-topline">
                <span className="question-label">{mode === 'quiz' ? 'QUESTION' : isRevealed ? 'THE ANSWER' : 'QUESTION'}</span>
                <span className="card-topic">{activeCard.subject}</span>
              </div>
              {mode === 'quiz' ? (
                <div className="card-front quiz-front">
                  <h3>{activeCard.question}</h3>
                  <div className="choice-prompt">{activeCard.answers.length > 1 ? 'SELECT ALL THAT APPLY' : 'SELECT ONE ANSWER'}</div>
                  <div className="choice-list" role="group" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => {
                      const isSelected = quizSelections.includes(choice);
                      const isCorrectChoice = activeCard.answers.includes(choice);
                      const isSingleAnswered = activeCard.answers.length === 1 && quizFinished;
                      const choiceClass = isSelected
                        ? isCorrectChoice ? 'is-quiz-correct' : 'is-quiz-wrong'
                        : isSingleAnswered && isCorrectChoice ? 'is-quiz-correct' : '';
                      return (
                        <button
                          className={`choice ${choiceClass}`}
                          key={choice}
                          onClick={() => selectQuizChoice(choice)}
                          disabled={quizFinished}
                          aria-pressed={isSelected}
                        >
                          <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                          <span>{choice}</span>
                          {isSelected && <span className="choice-indicator" />}
                          {isSingleAnswered && isCorrectChoice && <Check className="quiz-choice-icon" size={14} />}
                          {isSelected && !isCorrectChoice && <X className="quiz-choice-icon" size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  {quizSelections.length > 0 && (
                    <div className={`quiz-feedback ${quizFinished ? 'feedback-complete' : ''}`} aria-live="polite">
                      {activeCard.answers.length === 1 ? (
                        <>
                          <strong>{quizSelections[0] === activeCard.answers[0] ? 'Correct' : 'Not quite'}</strong>
                          <span>{activeCard.explanation}</span>
                        </>
                      ) : quizFinished ? (
                        <>
                          <strong>All correct</strong>
                          <span>{activeCard.explanation}</span>
                        </>
                      ) : quizSelections.some((selected) => !activeCard.answers.includes(selected)) ? (
                        <strong>That choice is not correct. Deselect it or try another.</strong>
                      ) : (
                        <strong>{quizSelections.length} of {activeCard.answers.length} correct choices selected</strong>
                      )}
                    </div>
                  )}
                </div>
              ) : !isRevealed ? (
                <div className="card-front">
                  <h3>{activeCard.question}</h3>
                  {activeCard.answers.length > 1 && <div className="choice-prompt">SELECT ALL THAT APPLY</div>}
                  <div className="choice-list" role="group" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => (
                      <button
                        className={`choice ${selectedChoices.includes(choice) ? 'is-selected' : ''}`}
                        key={choice}
                        onClick={() => selectFlashcardChoice(choice)}
                        aria-pressed={selectedChoices.includes(choice)}
                      >
                        <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                        <span>{choice}</span>
                        {selectedChoices.includes(choice) && <span className="choice-indicator" />}
                      </button>
                    ))}
                  </div>
                  <div className="card-footer">
                    <span className="choose-hint">{selectedChoices.length > 0 ? 'Ready when you are' : 'Choose your answer'}</span>
                    <button className="reveal-button" onClick={() => setIsRevealed(true)} disabled={selectedChoices.length === 0}>
                      Check answer <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card-back">
                  <span className={`answer-mark ${flashcardCorrect ? 'answer-correct' : 'answer-incorrect'}`}>
                    {flashcardCorrect ? <Check size={19} /> : <X size={19} />}
                  </span>
                  <div className="answer-result">{flashcardCorrect ? 'YOU GOT IT' : 'THE CORRECT ANSWER'}</div>
                  <h3>{activeCard.answers.join(', ')}</h3>
                  {activeCard.explanation && <p>{activeCard.explanation}</p>}
                  {!flashcardCorrect && <div className="your-answer">Your answer <span>{selectedChoices.join(', ') || 'No answer selected'}</span></div>}
                  <button className="back-to-question" onClick={() => setIsRevealed(false)}>
                    <ArrowLeft size={14} /> Back to question
                  </button>
                  <div className="card-footer back-footer">
                    <span className="choose-hint">How well did it stick?</span>
                    <span className="swipe-hint">SWIPE TO SORT</span>
                  </div>
                </div>
              )}
            </article>
            {mode === 'flashcards' && dragOffset > 24 && <div className="swipe-stamp stamp-learned">GOT IT <Check size={16} /></div>}
            {mode === 'flashcards' && dragOffset < -24 && <div className="swipe-stamp stamp-practice">REVISIT <RotateCcw size={14} /></div>}
          </div>

          {mode === 'flashcards' ? (
            <>
              <div className="review-actions">
                <button className="review-button practice-button" onClick={() => moveCard('practice')} disabled={!isRevealed}>
                  <span className="action-icon"><RotateCcw size={16} /></span>
                  <span>Needs practice</span>
                  <span className="action-key">←</span>
                </button>
                <span className="action-divider">OR</span>
                <button className="review-button learned-button" onClick={() => moveCard('learned')} disabled={!isRevealed}>
                  <span className="action-icon"><Check size={17} /></span>
                  <span>Got it</span>
                  <span className="action-key">→</span>
                </button>
              </div>
              <div className="gesture-note"><span className="gesture-arrows">↔</span> Swipe the card to sort it after checking your answer</div>
            </>
          ) : (
            <div className="quiz-actions">
              <button className="quiz-next" disabled={!quizFinished} onClick={advanceCard}>
                Next question <ArrowRight size={15} />
              </button>
              <button className="quiz-skip" disabled={quizFinished} onClick={() => {
                setStudy((current) => ({ ...current, review: { ...current.review, [activeCard.id]: 'practice' } }));
                advanceCard();
              }}>Skip</button>
            </div>
          )}
        </section>
      </section>

      <footer className="page-footer">
        <span>MAKE ROOM FOR CURIOSITY</span>
        <span>One card at a time <span className="footer-spark">✳</span></span>
      </footer>
    </main>
  );
}