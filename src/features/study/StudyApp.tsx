import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, ListChecks, RotateCcw, Sparkles } from 'lucide-react';
import { CategoryProgress } from './CategoryProgress';
import { flashcards } from './gh300Deck';
import { QuizQuestion } from './QuizQuestion';
import { getCardCategory, isAnswerCorrect, readSavedStudy, shuffle, STORAGE_KEY, type StudyMode } from './studySession';

export default function App() {
  const [study, setStudy] = useState(readSavedStudy);
  const { currentIndex, review, skipped, mode } = study;
  const [quizSelections, setQuizSelections] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevisitListOpen, setIsRevisitListOpen] = useState(false);
  const [isRevisitMode, setIsRevisitMode] = useState(false);
  const [revisitCardIds, setRevisitCardIds] = useState<string[]>([]);
  const [quizCategory, setQuizCategory] = useState<string | null>(null);
  const [quizOrderIds, setQuizOrderIds] = useState<string[]>(() => {
    if (study.mode !== 'quiz') return [];
    const shuffledIds = shuffle(flashcards.map((card) => card.id));
    const currentId = flashcards[study.currentIndex]?.id;
    const currentPosition = shuffledIds.indexOf(currentId);
    return currentPosition > 0
      ? [...shuffledIds.slice(currentPosition), ...shuffledIds.slice(0, currentPosition)]
      : shuffledIds;
  });
  const [quizChoiceOrders, setQuizChoiceOrders] = useState<Record<string, string[]>>(() =>
    study.mode === 'quiz'
      ? Object.fromEntries(flashcards.map((card) => [card.id, shuffle(card.choices)]))
      : {},
  );
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [quizSkippedIds, setQuizSkippedIds] = useState<string[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const suppressCardClick = useRef(false);
  const activeCard = flashcards[currentIndex];
  const studyDeck = isRevisitMode
    ? revisitCardIds.flatMap((id) => {
      const card = flashcards.find((item) => item.id === id);
      return card ? [card] : [];
    })
    : mode === 'quiz' && quizOrderIds.length > 0
      ? quizOrderIds.flatMap((id) => {
        const card = flashcards.find((item) => item.id === id);
        return card ? [card] : [];
      })
      : quizCategory
        ? flashcards.filter((card) => getCardCategory(card) === quizCategory)
      : flashcards;
  const deckPosition = studyDeck.findIndex((card) => card.id === activeCard.id);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(study));
  }, [study]);

  const learnedCount = Object.values(review).filter((status) => status === 'learned').length;
  const practiceCount = Object.values(review).filter((status) => status === 'practice').length;
  const reviewedCount = Object.keys(review).length;
  const progress = ((reviewedCount + skipped.length) / flashcards.length) * 100;
  const quizAnsweredCount = Object.keys(quizResults).length;
  const quizAttemptedCount = quizAnsweredCount + quizSkippedIds.length;
  const quizRemainingCount = Math.max(0, studyDeck.length - quizAttemptedCount);
  const quizCorrectCount = Object.values(quizResults).filter(Boolean).length;
  const activeQuizChoices = quizChoiceOrders[activeCard.id] ?? activeCard.choices;

  function advanceCard() {
    if (studyDeck.length === 0) return;
    if (mode === 'quiz' && deckPosition === studyDeck.length - 1) {
      setIsQuizComplete(true);
      return;
    }
    const nextCard = studyDeck[(deckPosition + 1) % studyDeck.length];
    setStudy((current) => ({
      ...current,
      currentIndex: flashcards.findIndex((card) => card.id === nextCard.id),
    }));
    setQuizSelections([]);
    setQuizSubmitted(false);
    setIsRevealed(false);
    setDragOffset(0);
  }

  function moveCard(direction: 'learned' | 'practice') {
    setStudy((current) => ({
      ...current,
      review: { ...current.review, [activeCard.id]: direction },
      skipped: current.skipped.filter((id) => id !== activeCard.id),
    }));
    advanceCard();
  }

  function changeMode(nextMode: StudyMode) {
    if (nextMode === 'quiz') {
      startQuiz(flashcards, null);
      return;
    }
    setStudy((current) => ({ ...current, mode: nextMode }));
    setQuizCategory(null);
    setQuizOrderIds([]);
    setQuizResults({});
    setQuizSkippedIds([]);
    setIsQuizComplete(false);
    setQuizSelections([]);
    setIsRevealed(false);
  }

  function viewRevisitCard(index: number) {
    const ids = flashcards.filter((card) => review[card.id] === 'practice').map((card) => card.id);
    setRevisitCardIds(ids);
    setIsRevisitMode(true);
    setStudy((current) => ({ ...current, currentIndex: index }));
    setQuizSelections([]);
    setQuizSubmitted(false);
    setIsRevealed(false);
    setDragOffset(0);
    setIsRevisitListOpen(false);
  }

  function viewStudyCard(index: number) {
    setIsRevisitMode(false);
    setRevisitCardIds([]);
    setQuizCategory(null);
    setQuizOrderIds([]);
    setStudy((current) => ({ ...current, currentIndex: index }));
    setQuizSelections([]);
    setQuizSubmitted(false);
    setIsRevealed(false);
    setDragOffset(0);
    document.getElementById('study')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startQuiz(cards: typeof flashcards, category: string | null) {
    if (cards.length === 0) return;
    const shuffledCards = shuffle(cards);
    const choiceOrders = Object.fromEntries(
      shuffledCards.map((card) => [card.id, shuffle(card.choices)]),
    );
    setIsRevisitMode(false);
    setRevisitCardIds([]);
    setQuizCategory(category);
    setQuizOrderIds(shuffledCards.map((card) => card.id));
    setQuizChoiceOrders(choiceOrders);
    setQuizResults({});
    setQuizSkippedIds([]);
    setQuizSubmitted(false);
    setIsQuizComplete(false);
    setStudy((current) => ({
      ...current,
      currentIndex: flashcards.findIndex((card) => card.id === shuffledCards[0].id),
      mode: 'quiz',
    }));
    setQuizSelections([]);
    setIsRevealed(false);
    setDragOffset(0);
    document.getElementById('study')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startCategoryQuiz(category: string) {
    const categoryCards = flashcards.filter(
      (card) => getCardCategory(card) === category,
    );
    startQuiz(categoryCards, category);
  }

  function submitQuizAnswer(selections: string[]) {
    const isCorrect = isAnswerCorrect(activeCard, selections);
    setQuizSelections(selections);
    setQuizSubmitted(true);
    setQuizResults((current) => ({ ...current, [activeCard.id]: isCorrect }));
    setStudy((current) => ({
      ...current,
      review: { ...current.review, [activeCard.id]: isCorrect ? 'learned' : 'practice' },
      skipped: current.skipped.filter((id) => id !== activeCard.id),
    }));
  }

  function skipQuizQuestion() {
    setQuizSkippedIds((current) => current.includes(activeCard.id) ? current : [...current, activeCard.id]);
    setStudy((current) => ({
      ...current,
      review: Object.fromEntries(Object.entries(current.review).filter(([id]) => id !== activeCard.id)),
      skipped: current.skipped.includes(activeCard.id) ? current.skipped : [...current.skipped, activeCard.id],
    }));
    advanceCard();
  }

  function selectQuizChoice(choice: string) {
    if (quizSubmitted) return;
    if (activeCard.answers.length === 1) {
      submitQuizAnswer([choice]);
      return;
    }
    const nextSelections = quizSelections.includes(choice)
      ? quizSelections.filter((selected) => selected !== choice)
      : [...quizSelections, choice];
    setQuizSelections(nextSelections);
  }

  function resetSession() {
    setStudy((current) => ({ currentIndex: 0, review: {}, skipped: [], mode: current.mode }));
    setIsRevisitMode(false);
    setRevisitCardIds([]);
    setQuizCategory(null);
    setIsRevisitListOpen(false);
    setQuizSelections([]);
    setQuizSubmitted(false);
    setQuizResults({});
    setQuizSkippedIds([]);
    setIsQuizComplete(false);
    setIsRevealed(false);
    if (mode === 'quiz') {
      startQuiz(flashcards, null);
    } else {
      setQuizOrderIds([]);
      setQuizChoiceOrders({});
    }
  }

  function toggleFlashcard(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
    if (mode !== 'flashcards') return;
    if ('key' in event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
    } else if (suppressCardClick.current) {
      suppressCardClick.current = false;
      return;
    }
    setIsRevealed((current) => !current);
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    suppressCardClick.current = false;
    if (!isRevealed || mode !== 'flashcards') return;
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (pointerStart.current === null) return;
    if (Math.abs(event.clientX - pointerStart.current) > 10) suppressCardClick.current = true;
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
    <main className="relative mx-auto min-h-screen max-w-[1320px] px-10 max-[960px]:px-6 max-[720px]:px-4">
      <header className="flex h-[82px] items-center justify-between border-b border-line max-[720px]:h-[68px]">
        <a className="inline-flex items-center gap-[10px] text-[19px] font-bold tracking-[-.3px] text-ink no-underline" href="#study" aria-label="Fieldnotes home">
          <span className="brand-mark relative grid size-[25px] rotate-[-32deg] place-items-center rounded-full border-[1.5px] border-green"><span /></span>
          <span>fieldnotes</span>
        </a>
        <div className="flex items-center gap-[23px]">
          <span className="flex items-center gap-[9px] font-mono text-[10px] tracking-[.8px] text-[#696f65] max-[720px]:text-[8px]"><span className="size-[7px] rounded-full bg-[#80a568] shadow-[0_0_0_3px_#e6ecdf]" /> STUDY SESSION</span>
          <button className="grid size-11 cursor-pointer place-items-center rounded-xl border border-line bg-white text-muted transition-colors duration-200 hover:border-green hover:text-green" onClick={resetSession} aria-label="Reset study session" title="Reset session">
            <RotateCcw size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="mx-auto my-12 grid max-w-[1100px] grid-cols-[240px_minmax(0,1fr)] items-start gap-16 max-[960px]:grid-cols-[200px_minmax(0,1fr)] max-[960px]:gap-8 max-[720px]:my-6 max-[720px]:flex max-[720px]:flex-col max-[720px]:gap-6" id="study">
        <aside className="pt-[21px] max-[720px]:grid max-[720px]:w-full max-[720px]:grid-cols-1 max-[720px]:items-start max-[720px]:pt-0" aria-label="Study progress">
          <div className="flex items-center gap-[9px] whitespace-nowrap font-mono text-[9px] tracking-[.8px] text-[#82877d] max-[720px]:col-span-full"><span className="inline-block h-px w-5 bg-coral" /> YOUR STUDY DESK</div>
          <h1 className="mb-3 mt-6 font-display text-[40px] font-semibold leading-[1.15] tracking-[-1.4px] max-[960px]:text-[34px] max-[720px]:mb-0 max-[720px]:mt-3 max-[720px]:text-[28px]">A little closer to <span className="text-green">knowing.</span></h1>
          <p className="m-0 text-[13px] leading-[1.7] text-muted max-[720px]:hidden">Small steps make<br />strong memories.</p>

          <div className="mt-[60px] border-t border-line pt-[17px] max-[720px]:col-span-full max-[720px]:ml-0 max-[720px]:mt-4 max-[720px]:w-full max-[720px]:pt-3">
            <div className="flex justify-between font-mono text-[9px] tracking-[.8px] text-[#70766c] max-[720px]:text-[8px]">
              <span>SESSION PROGRESS</span>
              <span className="text-green">{reviewedCount + skipped.length}<span className="text-[#9c9e96]"> / {flashcards.length}</span></span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7edf1]" role="progressbar" aria-label="Session progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-green transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex flex-col gap-[9px] text-[11px] text-[#757b71] max-[720px]:mt-[10px] max-[720px]:flex-row max-[720px]:gap-4 max-[720px]:text-[10px] max-[380px]:gap-3 max-[380px]:text-[9px]">
              <span className="flex items-center gap-[7px] whitespace-nowrap max-[720px]:gap-1"><Check className="text-green max-[720px]:w-3" size={14} /> {learnedCount} learned</span>
              <button
                className="flex min-h-11 cursor-pointer items-center gap-[7px] border-0 bg-transparent p-0 text-left text-muted hover:text-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green max-[720px]:gap-1"
                type="button"
                aria-expanded={isRevisitListOpen}
                aria-controls="revisit-card-list"
                onClick={() => setIsRevisitListOpen((open) => !open)}
              >
                <RotateCcw className="text-coral max-[720px]:w-3" size={13} /> {practiceCount} to revisit
                <ChevronDown className={`transition-transform ${isRevisitListOpen ? 'rotate-180' : ''}`} size={12} />
              </button>
            </div>
            {isRevisitListOpen && (
              <div id="revisit-card-list" className="mt-3 max-h-[220px] overflow-y-auto border-y border-line" aria-label="Cards to revisit">
                {practiceCount === 0 ? (
                  <p className="my-3 text-[10px] text-muted">No cards to revisit yet.</p>
                ) : flashcards.map((card, index) => review[card.id] === 'practice' && (
                  <button
                    className="flex w-full cursor-pointer flex-col items-start gap-1 border-0 border-b border-line bg-transparent px-1 py-[10px] text-left last:border-b-0 hover:bg-[#f5f5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-green"
                    key={card.id}
                    type="button"
                    onClick={() => viewRevisitCard(index)}
                  >
                    <span className="font-mono text-[8px] text-coral">{card.subject}</span>
                    <span className="text-[10px] leading-[1.4] text-ink">{card.question}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-[46px] flex items-center gap-[11px] border-t border-line pt-[18px] max-[720px]:hidden">
            <div className="grid size-[31px] place-items-center bg-[#e9eee4] text-green"><Sparkles size={16} /></div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold">GH-300 exam prep</span>
              <span className="text-[10px] text-[#8d9189]">Practice question bank</span>
            </div>
            <span className="self-start font-mono text-[10px] text-[#8c9288]">{String(flashcards.length).padStart(2, '0')}</span>
          </div>
        </aside>

        <section className="min-w-0 w-full" aria-label="Flashcard study area">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-fit gap-1 rounded-xl bg-[#e9eef2] p-1" role="tablist" aria-label="Study mode">
            <button role="tab" aria-selected={mode === 'flashcards'} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-0 px-4 py-2 text-[13px] font-medium transition-colors ${mode === 'flashcards' ? 'bg-paper text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'}`} onClick={() => changeMode('flashcards')}>
              <Layers size={15} /> Flashcards
            </button>
            <button role="tab" aria-selected={mode === 'quiz'} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-0 px-4 py-2 text-[13px] font-medium transition-colors ${mode === 'quiz' ? 'bg-paper text-ink shadow-sm' : 'bg-transparent text-muted hover:text-ink'}`} onClick={() => changeMode('quiz')}>
              <ListChecks size={15} /> Quiz
            </button>
          </div>
          {(isRevisitMode || quizCategory) && (
            <button
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-[12px] text-muted hover:text-green-dark"
              type="button"
              onClick={() => {
                if (quizCategory && !isRevisitMode) {
                  startQuiz(flashcards, null);
                  return;
                }
                setIsRevisitMode(false);
                setRevisitCardIds([]);
                setQuizCategory(null);
                setQuizOrderIds([]);
                setQuizResults({});
                setQuizSkippedIds([]);
                setQuizSubmitted(false);
                setIsQuizComplete(false);
                setQuizSelections([]);
                setIsRevealed(false);
              }}
            >
              All cards
            </button>
          )}
          </div>
          <div className="mb-[19px] flex items-end justify-between max-[720px]:mb-[14px]">
            <div>
              <div className="font-mono text-[9px] tracking-[.8px] text-[#8a8e84]">CERTIFICATION REVIEW <span className="px-1 text-[#c9c8bd]">/</span> {activeCard.subject.toUpperCase()}</div>
              <h2 className="mt-2 text-[17px] font-medium">{isRevisitMode ? 'Revisit' : quizCategory ? `${quizCategory} quiz` : mode === 'quiz' ? 'Quick quiz' : 'Quick study'} <span className="text-[#b6b9ad]">·</span> <b className="text-[13px] font-normal text-[#92978d]">{deckPosition + 1} of {studyDeck.length}</b></h2>
            </div>
            <div className="flex items-baseline gap-[7px] font-mono text-[11px] text-[#adb0a5]" aria-label={`Card ${deckPosition + 1} of ${studyDeck.length}`}>
              <span className="text-[20px] text-green">{String(deckPosition + 1).padStart(2, '0')}</span>
              <span className="text-[#d0d1c8]">/</span>
              <span>{String(studyDeck.length).padStart(2, '0')}</span>
            </div>
          </div>

          {mode === 'quiz' && !isQuizComplete && (
            <div className="mb-4" aria-label="Quiz progress">
              <div className="mb-2 flex justify-between font-mono text-[9px] text-[#777e72]">
                <span>{quizAttemptedCount} answered</span>
                <span>{quizRemainingCount} remaining</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e7edf1]" role="progressbar" aria-label="Quiz progress" aria-valuenow={Math.round((quizAttemptedCount / studyDeck.length) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span className="block h-full bg-green transition-[width] duration-300" style={{ width: `${(quizAttemptedCount / studyDeck.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className={`relative min-h-[405px] max-[720px]:min-h-[410px] ${mode === 'quiz' && isQuizComplete ? 'hidden' : ''}`}>
            <article
              className={`relative flex min-h-[405px] select-none flex-col rounded-2xl border border-line bg-paper p-7 shadow-[0_4px_24px_#18252f06] transition-[transform,box-shadow] duration-200 max-[720px]:min-h-[410px] max-[720px]:p-5 ${mode === 'flashcards' ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green' : ''}`}
              style={{ transform: `translateX(${dragOffset}px) rotate(${dragOffset / 24}deg)` }}
              onClick={toggleFlashcard}
              onKeyDown={toggleFlashcard}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                pointerStart.current = null;
                setDragOffset(0);
              }}
              role={mode === 'flashcards' ? 'button' : undefined}
              tabIndex={mode === 'flashcards' ? 0 : undefined}
              aria-label={mode === 'flashcards' ? isRevealed ? 'Back to question' : 'Reveal answer' : undefined}
              aria-live="polite"
            >
              <div className="flex items-center justify-between border-b border-[#efeee8] pb-[17px]">
                <span className="font-mono text-[9px] tracking-[.8px] text-green">{mode === 'quiz' ? 'QUESTION' : isRevealed ? 'THE ANSWER' : 'QUESTION'}</span>
                <span className="bg-[#f4f3ec] px-[9px] py-[5px] text-[9px] text-[#777e72]">{activeCard.subject}</span>
              </div>
              {mode === 'quiz' ? (
                <QuizQuestion
                  card={activeCard}
                  choices={activeQuizChoices}
                  selections={quizSelections}
                  submitted={quizSubmitted}
                  onSelectChoice={selectQuizChoice}
                  onSubmit={() => submitQuizAnswer(quizSelections)}
                />
              ) : !isRevealed ? (
                <div className="flex flex-1 flex-col">
                  <h3 className="mb-4 mt-6 text-[23px] font-semibold leading-[1.45] tracking-[-.5px] max-[720px]:text-[20px]">{activeCard.question}</h3>
                  {activeCard.answers.length > 1 && <div className="mb-4 text-[12px] text-muted">Multiple correct answers</div>}
                  <div className="grid grid-cols-1 gap-2.5" role="group" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => (
                      <div
                        className="answer-choice"
                        key={choice}
                      >
                        <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                        <span>{choice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-[19px]">
                    <span className="text-[12px] text-muted">Tap anywhere to reveal the answer</span>
                    <ArrowRight className="text-green" size={15} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col pt-6">
                  <div className="mb-4 font-mono text-[10px] tracking-[.8px] text-muted">THE CORRECT ANSWER</div>
                  <div className="flex flex-col gap-3">
                    {activeCard.answers.map((answer) => (
                      <div className="flex items-start gap-3 rounded-xl border border-line bg-[#f6faf9] p-4" key={answer}>
                        <span className="choice-letter border-green text-green-dark">{String.fromCharCode(65 + activeCard.choices.indexOf(answer))}</span>
                        <h3 className="pt-0.5 text-[18px] font-medium leading-relaxed tracking-[-.3px]">{answer}</h3>
                      </div>
                    ))}
                  </div>
                  {activeCard.explanation && <p className="m-0 max-w-[410px] text-[12px] leading-[1.65] text-[#72786f]">{activeCard.explanation}</p>}
                  <span className="mt-4 flex w-fit items-center gap-2 text-[12px] text-green">
                    <ArrowLeft size={14} /> Tap card to return to question
                  </span>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5">
                    <span className="text-[12px] text-muted">How well did it stick?</span>
                    <span className="font-mono text-[9px] tracking-[.8px] text-muted">SWIPE TO SORT</span>
                  </div>
                </div>
              )}
            </article>
            {mode === 'flashcards' && dragOffset > 24 && <div className="pointer-events-none absolute right-[22px] top-[72px] z-[3] flex rotate-[8deg] items-center gap-[5px] border-2 border-green px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-green">GOT IT <Check size={16} /></div>}
            {mode === 'flashcards' && dragOffset < -24 && <div className="pointer-events-none absolute left-[22px] top-[72px] z-[3] flex -rotate-[8deg] items-center gap-[5px] border-2 border-coral px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-coral">REVISIT <RotateCcw size={14} /></div>}
          </div>

          {mode === 'quiz' && isQuizComplete && (
            <article className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-line bg-paper px-6 py-10 text-center shadow-[0_4px_24px_#18252f06]" aria-live="polite">
              <span className="grid size-[42px] place-items-center rounded-full bg-[#e9f0e5] text-green">
                <Check size={23} />
              </span>
              <h3 className="mb-1 mt-4 font-display text-[27px] font-semibold">Quiz complete</h3>
              <p className="mb-5 mt-2 text-[15px] leading-relaxed text-muted">
                You got {quizCorrectCount} of {studyDeck.length} questions correct ({Math.round((quizCorrectCount / studyDeck.length) * 100)}%).
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[12px] text-muted">
                <span>{quizAnsweredCount - quizCorrectCount} incorrect</span>
                <span>{quizSkippedIds.length} skipped</span>
              </div>
              <button
                className="primary-action"
                type="button"
                onClick={() => startQuiz(
                  quizCategory
                    ? flashcards.filter((card) => getCardCategory(card) === quizCategory)
                    : flashcards,
                  quizCategory,
                )}
              >
                Quiz again <RotateCcw size={14} />
              </button>
            </article>
          )}

          {mode === 'flashcards' ? (
            <>
              <div className="mt-[25px] flex items-center justify-center gap-[15px] max-[720px]:mt-[22px] max-[720px]:gap-2">
                <button className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-muted transition-colors hover:border-coral hover:text-coral" onClick={() => moveCard('practice')}>
                  <RotateCcw size={16} />
                  <span>Needs practice</span>
                  <span className="ml-auto font-mono text-[10px] text-[#a8a99f] max-[720px]:hidden">←</span>
                </button>
                <span className="font-mono text-[8px] text-[#b0b2a8] max-[720px]:text-[7px]">OR</span>
                <button className="primary-action flex-1" onClick={() => moveCard('learned')} disabled={!isRevealed}>
                  <Check size={17} />
                  <span>Got it</span>
                  <span className="ml-auto font-mono text-[10px] max-[720px]:hidden">→</span>
                </button>
              </div>
              <div className="mt-[15px] text-center text-[10px] text-[#92968d] max-[720px]:text-[9px]"><span className="mr-1 align-[-1px] text-[15px] text-green">↔</span> Swipe the card to sort it after checking your answer</div>
            </>
          ) : !isQuizComplete && (
            <div className="mt-[25px] flex items-center justify-center gap-[15px] max-[720px]:mt-[19px]">
              <button className="primary-action max-[720px]:flex-1" disabled={!quizSubmitted} onClick={advanceCard}>
                {deckPosition === studyDeck.length - 1 ? 'See results' : 'Next question'} <ArrowRight size={15} />
              </button>
              <button className="min-h-11 cursor-pointer rounded-lg border-0 bg-transparent px-4 text-[13px] text-muted hover:bg-[#e9eef2] disabled:cursor-default disabled:opacity-50" disabled={quizSubmitted} onClick={skipQuizQuestion}>Skip</button>
            </div>
          )}
        </section>
      </section>

      <CategoryProgress
        review={review}
        skipped={skipped}
        onViewCard={viewStudyCard}
        onStartQuiz={startCategoryQuiz}
      />

      <footer className="flex min-h-[56px] items-center justify-between border-t border-line font-mono text-[8px] tracking-[.8px] text-[#989b91] max-[720px]:min-h-[48px]">
        <span>MAKE ROOM FOR CURIOSITY</span>
        <span className="font-sans text-[10px] tracking-normal">One card at a time <span className="ml-[5px] text-coral">✳</span></span>
      </footer>
    </main>
  );
}