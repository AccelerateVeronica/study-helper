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
  const [quizSelections, setQuizSelections] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const activeCard = flashcards[currentIndex];
  const quizFinished = activeCard.answers.length === 1
    ? quizSelections.length > 0
    : activeCard.answers.every((answer) => quizSelections.includes(answer))
      && quizSelections.every((choice) => activeCard.answers.includes(choice));
  const quizAnswerCorrect = quizSelections.length === activeCard.answers.length
    && activeCard.answers.every((answer) => quizSelections.includes(answer));
  const quizHasIncorrectChoice = quizSelections.some((choice) => !activeCard.answers.includes(choice));
  const quizFeedbackTone = quizAnswerCorrect
    ? 'border-green bg-[#f0f4ed] text-green-dark'
    : quizHasIncorrectChoice || activeCard.answers.length === 1
      ? 'border-coral bg-[#fbf3ef] text-[#935342]'
      : 'border-[#d9d9cf] bg-[#f4f3ec] text-[#697066]';
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(study));
  }, [study]);

  const learnedCount = Object.values(review).filter((status) => status === 'learned').length;
  const practiceCount = Object.values(review).filter((status) => status === 'practice').length;
  const progress = (Object.keys(review).length / flashcards.length) * 100;

  function advanceCard() {
    setStudy((current) => ({ ...current, currentIndex: (current.currentIndex + 1) % flashcards.length }));
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
    setQuizSelections([]);
    setIsRevealed(false);
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
    setQuizSelections([]);
    setIsRevealed(false);
  }

  function revealFlashcard(event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
    if (mode !== 'flashcards' || isRevealed) return;
    if (event?.target instanceof HTMLElement && event.target.closest('button')) return;
    if (event && 'key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    if (event && 'key' in event) event.preventDefault();
    setIsRevealed(true);
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
    <main className="relative mx-auto min-h-screen max-w-[1600px] overflow-hidden px-[7.15%] max-[960px]:px-[5%] max-[720px]:px-[22px] max-[380px]:px-4">
      <header className="flex h-[82px] items-center justify-between border-b border-line max-[720px]:h-[68px]">
        <a className="inline-flex items-center gap-[10px] text-[19px] font-bold tracking-[-.3px] text-ink no-underline" href="#study" aria-label="Fieldnotes home">
          <span className="brand-mark relative grid size-[25px] rotate-[-32deg] place-items-center rounded-full border-[1.5px] border-green"><span /></span>
          <span>fieldnotes</span>
        </a>
        <div className="flex items-center gap-[23px]">
          <span className="flex items-center gap-[9px] font-mono text-[10px] tracking-[.8px] text-[#696f65] max-[720px]:text-[8px]"><span className="size-[7px] rounded-full bg-[#80a568] shadow-[0_0_0_3px_#e6ecdf]" /> STUDY SESSION</span>
          <button className="grid size-[35px] cursor-pointer place-items-center border border-line bg-transparent transition-colors duration-200 hover:border-green hover:bg-green hover:text-white" onClick={resetSession} aria-label="Reset study session" title="Reset session">
            <RotateCcw size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="mx-auto my-[68px] mb-[74px] grid max-w-[1100px] grid-cols-[minmax(210px,.75fr)_minmax(470px,1.4fr)] items-start gap-[clamp(56px,10.2vw,154px)] min-[1400px]:mt-[82px] max-[960px]:grid-cols-[190px_minmax(420px,1fr)] max-[960px]:gap-[45px] max-[720px]:my-[34px] max-[720px]:mb-[48px] max-[720px]:flex max-[720px]:flex-col max-[720px]:gap-[24px]" id="study">
        <aside className="pt-[21px] max-[720px]:grid max-[720px]:w-full max-[720px]:grid-cols-1 max-[720px]:items-start max-[720px]:pt-0" aria-label="Study progress">
          <div className="flex items-center gap-[9px] whitespace-nowrap font-mono text-[9px] tracking-[.8px] text-muted max-[720px]:col-span-full"><span className="inline-block h-px w-5 bg-coral" /> YOUR STUDY DESK</div>
          <h1 className="mb-[14px] mt-[28px] font-display text-[clamp(39px,4vw,52px)] font-semibold leading-[1.09] tracking-[-.7px] max-[960px]:text-[43px] max-[720px]:col-span-full max-[720px]:mb-0 max-[720px]:mt-[15px] max-[720px]:text-[30px] max-[720px]:leading-[1.15]">A little{' '}<br className="max-[720px]:hidden" />closer to{' '}<br className="max-[720px]:hidden" /> <em className="font-semibold text-green">knowing.</em></h1>
          <p className="m-0 text-[13px] leading-[1.7] text-muted max-[720px]:hidden">Small steps make<br />strong memories.</p>

          <div className="mt-[60px] border-t border-line pt-[17px] max-[720px]:col-span-full max-[720px]:ml-0 max-[720px]:mt-4 max-[720px]:w-full max-[720px]:pt-3">
            <div className="flex justify-between font-mono text-[9px] tracking-[.8px] text-muted max-[720px]:text-[8px]">
              <span>SESSION PROGRESS</span>
              <span className="text-green">{Object.keys(review).length}<span className="text-muted"> / {flashcards.length}</span></span>
            </div>
            <div className="mt-[13px] h-1 overflow-hidden bg-[#e7e7dd]" role="progressbar" aria-label="Session progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-green transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex flex-col gap-[9px] text-[11px] text-muted max-[720px]:mt-[10px] max-[720px]:flex-row max-[720px]:gap-4 max-[720px]:text-[10px] max-[380px]:gap-3 max-[380px]:text-[9px]">
              <span className="flex items-center gap-[7px] whitespace-nowrap max-[720px]:gap-1"><Check className="text-green max-[720px]:w-3" size={14} /> {learnedCount} learned</span>
              <span className="flex items-center gap-[7px] whitespace-nowrap max-[720px]:gap-1"><RotateCcw className="text-green max-[720px]:w-3" size={13} /> {practiceCount} to revisit</span>
            </div>
          </div>

          <div className="mt-[46px] flex items-center gap-[11px] border-t border-line pt-[18px] max-[720px]:hidden">
            <div className="grid size-[31px] place-items-center bg-[#e9eee4] text-green"><Sparkles size={16} /></div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold">GH-300 exam prep</span>
              <span className="text-[10px] text-muted">Practice question bank</span>
            </div>
            <span className="self-start font-mono text-[10px] text-muted">{String(flashcards.length).padStart(2, '0')}</span>
          </div>
        </aside>

        <section className="w-full max-w-[570px] max-[720px]:max-w-none" aria-label="Flashcard study area">
          <div className="mb-5 flex w-fit gap-[3px] bg-[#eae9e1] p-[3px] max-[720px]:mb-[17px]" role="tablist" aria-label="Study mode">
            <button role="tab" aria-selected={mode === 'flashcards'} className={`flex cursor-pointer items-center gap-[7px] border-0 bg-transparent px-3 py-2 text-[10px] ${mode === 'flashcards' ? 'bg-paper text-green-dark shadow-[0_1px_3px_#25332412]' : 'text-muted'}`} onClick={() => changeMode('flashcards')}>
              <Layers size={15} /> Flashcards
            </button>
            <button role="tab" aria-selected={mode === 'quiz'} className={`flex cursor-pointer items-center gap-[7px] border-0 bg-transparent px-3 py-2 text-[10px] ${mode === 'quiz' ? 'bg-paper text-green-dark shadow-[0_1px_3px_#25332412]' : 'text-muted'}`} onClick={() => changeMode('quiz')}>
              <ListChecks size={15} /> Quiz
            </button>
          </div>
          <div className="mb-[19px] flex items-end justify-between max-[720px]:mb-[14px]">
            <div>
              <div className="font-mono text-[9px] tracking-[.8px] text-muted">CERTIFICATION REVIEW <span className="px-1 text-muted">/</span> {activeCard.subject.toUpperCase()}</div>
              <h2 className="mt-2 text-[17px] font-medium">{mode === 'quiz' ? 'Quick quiz' : 'Quick study'} <span className="text-muted">·</span> <b className="text-[13px] font-normal text-muted">{currentIndex + 1} of {flashcards.length}</b></h2>
            </div>
            <div className="flex items-baseline gap-[7px] font-mono text-[11px] text-muted" aria-label={`Card ${currentIndex + 1} of ${flashcards.length}`}>
              <span className="text-[20px] text-green">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="text-muted">/</span>
              <span>{String(flashcards.length).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="relative min-h-[405px] max-[720px]:min-h-[410px]">
            <div className="absolute inset-[9px_-8px_-8px_8px] rounded-[6px] border border-[#ebe9e0] bg-[#f1efe6]" />
            <div className="absolute inset-[4px_-4px_-4px_4px] rounded-[6px] border border-[#ebe9e0] bg-[#f8f7f1]" />
            <article
              className={`relative flex min-h-[405px] select-none flex-col rounded-[6px] border border-[#ece9df] bg-paper px-[29px] pb-[21px] pt-6 transition-[transform,box-shadow] duration-200 max-[960px]:px-[23px] max-[720px]:min-h-[410px] max-[720px]:px-[19px] max-[720px]:pb-[17px] max-[720px]:pt-[19px] max-[380px]:px-[15px] ${mode === 'flashcards' && !isRevealed ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
              style={{ transform: `translateX(${dragOffset}px) rotate(${dragOffset / 24}deg)` }}
              onClick={revealFlashcard}
              onKeyDown={revealFlashcard}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              role={mode === 'flashcards' && !isRevealed ? 'button' : undefined}
              tabIndex={mode === 'flashcards' && !isRevealed ? 0 : undefined}
              aria-label={mode === 'flashcards' && !isRevealed ? 'Reveal answer' : undefined}
              aria-live="polite"
            >
              <div className="flex items-center justify-between border-b border-[#efeee8] pb-[17px]">
                <span className="font-mono text-[9px] tracking-[.8px] text-green">{mode === 'quiz' ? 'QUESTION' : isRevealed ? 'THE ANSWER' : 'QUESTION'}</span>
                <span className="bg-[#f4f3ec] px-[9px] py-[5px] text-[9px] text-muted">{activeCard.subject}</span>
              </div>
              {mode === 'quiz' ? (
                <div className="flex flex-1 flex-col">
                  <h3 className="mb-[15px] mt-[22px] max-w-[420px] font-display text-[24px] font-semibold leading-[1.35] max-[720px]:mt-[21px] max-[720px]:text-[22px] max-[380px]:text-[20px]">{activeCard.question}</h3>
                  <div className="-mt-[7px] mb-[10px] font-mono text-[8px] tracking-[.7px] text-muted">{activeCard.answers.length > 1 ? 'SELECT ALL THAT APPLY' : 'SELECT ONE ANSWER'}</div>
                  <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1 max-[720px]:gap-[7px]" role="list" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => {
                      const isSelected = quizSelections.includes(choice);
                      const isCorrectChoice = activeCard.answers.includes(choice);
                      const isSingleAnswered = activeCard.answers.length === 1 && quizFinished;
                      const choiceClass = isSelected
                        ? isCorrectChoice
                          ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                          : 'border-[#e1b5a9] bg-[#fbefeb] text-[#a64e3c] hover:border-[#e1b5a9] hover:bg-[#fbefeb]'
                        : isSingleAnswered && isCorrectChoice
                          ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                          : '';
                      const letterClass = isSelected && isCorrectChoice || isSingleAnswered && isCorrectChoice
                        ? 'border-green bg-green text-white'
                        : isSelected && !isCorrectChoice ? 'border-coral-dark bg-coral-dark text-white' : '';
                      return (
                        <button
                          className={`relative flex min-h-[42px] cursor-pointer items-center gap-[9px] border border-[#e8e7df] bg-transparent px-[10px] py-2 pr-8 text-left text-[11px] transition-[border-color,background] duration-[160ms] hover:border-[#9cad92] hover:bg-[#fafbf7] disabled:cursor-default max-[720px]:min-h-[44px] ${choiceClass}`}
                          key={choice}
                          onClick={() => selectQuizChoice(choice)}
                          disabled={quizFinished}
                          aria-pressed={isSelected}
                        >
                          <span className={`grid size-[19px] flex-none place-items-center border border-[#e7e7df] font-mono text-[9px] ${letterClass || 'text-muted'}`}>{String.fromCharCode(65 + index)}</span>
                          <span>{choice}</span>
                          {isSingleAnswered && isCorrectChoice && <Check className="absolute right-[10px]" size={14} />}
                          {isSelected && !isCorrectChoice && <X className="absolute right-[10px]" size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  {quizSelections.length > 0 && (
                    <div className={`mt-3 flex flex-col gap-[5px] border-l-2 px-[10px] py-[9px] text-[10px] leading-[1.5] ${quizFeedbackTone}`} aria-live="polite">
                      {activeCard.answers.length === 1 ? (
                        <>
                          <strong className="font-semibold">{quizSelections[0] === activeCard.answers[0] ? 'Correct' : 'Not quite'}</strong>
                          <span className="text-muted">{activeCard.explanation}</span>
                        </>
                      ) : quizFinished ? (
                        <>
                          <strong className="font-semibold text-green">All correct</strong>
                          <span className="text-muted">{activeCard.explanation}</span>
                        </>
                      ) : quizSelections.some((selected) => !activeCard.answers.includes(selected)) ? (
                        <strong className="font-semibold">That choice is not correct. Deselect it or try another.</strong>
                      ) : (
                        <strong className="font-semibold">{quizSelections.length} of {activeCard.answers.length} correct choices selected</strong>
                      )}
                    </div>
                  )}
                </div>
              ) : !isRevealed ? (
                <div className="flex flex-1 flex-col">
                  <h3 className="mb-4 mt-[22px] max-w-[420px] font-display text-[24px] font-semibold leading-[1.35] max-[720px]:mt-[21px] max-[720px]:text-[22px] max-[380px]:text-[20px]">{activeCard.question}</h3>
                  {activeCard.answers.length > 1 && <div className="-mt-[7px] mb-[10px] font-mono text-[8px] tracking-[.7px] text-muted">SELECT ALL THAT APPLY</div>}
                  <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1 max-[720px]:gap-[7px]" role="group" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => (
                      <div
                        className="relative flex min-h-[42px] items-center gap-[9px] border border-[#e8e7df] bg-transparent px-[10px] py-2 text-left text-[11px] max-[720px]:min-h-[44px]"
                        key={choice}
                        role="listitem"
                      >
                        <span className="grid size-[19px] flex-none place-items-center border border-[#e7e7df] font-mono text-[9px] text-muted">{String.fromCharCode(65 + index)}</span>
                        <span>{choice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-[19px]">
                    <span className="text-[10px] text-muted">Tap card to reveal answer</span>
                    <ArrowRight className="text-green" size={15} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col pt-6">
                  <span className="grid size-[34px] place-items-center rounded-full bg-[#e9f0e5] text-green">
                    <Check size={19} />
                  </span>
                  <div className="mt-[13px] font-mono text-[9px] tracking-[.8px] text-muted">THE CORRECT ANSWER</div>
                  <h3 className="my-2 font-display text-[28px] font-semibold">{activeCard.answers.join(', ')}</h3>
                  {activeCard.explanation && <p className="m-0 max-w-[410px] text-[12px] leading-[1.65] text-muted">{activeCard.explanation}</p>}
                  <button className="mt-3 flex w-fit cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-[10px] text-green" onClick={() => setIsRevealed(false)}>
                    <ArrowLeft size={14} /> Back to question
                  </button>
                  <div className="mt-auto flex items-center justify-between border-t border-[#efeee8] pt-[19px]">
                    <span className="text-[10px] text-muted">How well did it stick?</span>
                    <span className="font-mono text-[8px] tracking-[.8px] text-muted">SWIPE TO SORT</span>
                  </div>
                </div>
              )}
            </article>
            {mode === 'flashcards' && dragOffset > 24 && <div className="pointer-events-none absolute right-[22px] top-[72px] z-[3] flex rotate-[8deg] items-center gap-[5px] border-2 border-green px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-green">GOT IT <Check size={16} /></div>}
            {mode === 'flashcards' && dragOffset < -24 && <div className="pointer-events-none absolute left-[22px] top-[72px] z-[3] flex -rotate-[8deg] items-center gap-[5px] border-2 border-coral px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-coral-dark">REVISIT <RotateCcw size={14} /></div>}
          </div>

          {mode === 'flashcards' ? (
            <>
              <div className="mt-[25px] flex items-center justify-center gap-[15px] max-[720px]:mt-[22px] max-[720px]:gap-2">
                <button className="flex h-[49px] min-w-[185px] cursor-pointer items-center gap-[10px] border border-[#e3c9c0] bg-transparent px-[13px] text-[11px] text-[#a55847] transition-colors hover:enabled:bg-[#f9ebe6] disabled:cursor-not-allowed disabled:opacity-[.43] max-[720px]:h-[46px] max-[720px]:min-w-0 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:gap-[7px] max-[720px]:px-[9px] max-[720px]:text-[10px]" onClick={() => moveCard('practice')} disabled={!isRevealed}>
                  <span className="grid size-[26px] place-items-center bg-[#f2e8e3] max-[720px]:size-[23px]"><RotateCcw size={16} /></span>
                  <span>Needs practice</span>
                  <span className="ml-auto font-mono text-[10px] text-muted max-[720px]:hidden">←</span>
                </button>
                <span className="font-mono text-[8px] text-muted max-[720px]:text-[7px]">OR</span>
                <button className="flex h-[49px] min-w-[185px] cursor-pointer items-center gap-[10px] border border-[#cad7c7] bg-transparent px-[13px] text-[11px] text-green transition-colors hover:enabled:bg-[#eaf0e6] disabled:cursor-not-allowed disabled:opacity-[.43] max-[720px]:h-[46px] max-[720px]:min-w-0 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:gap-[7px] max-[720px]:px-[9px] max-[720px]:text-[10px]" onClick={() => moveCard('learned')} disabled={!isRevealed}>
                  <span className="grid size-[26px] place-items-center bg-[#e8eee5] max-[720px]:size-[23px]"><Check size={17} /></span>
                  <span>Got it</span>
                  <span className="ml-auto font-mono text-[10px] text-muted max-[720px]:hidden">→</span>
                </button>
              </div>
              <div className="mt-[15px] text-center text-[10px] text-muted max-[720px]:text-[9px]"><span className="mr-1 align-[-1px] text-[15px] text-green">↔</span> Swipe the card to sort it after checking your answer</div>
            </>
          ) : (
            <div className="mt-[25px] flex items-center justify-center gap-[15px] max-[720px]:mt-[19px]">
              <button className="inline-flex min-h-[46px] cursor-pointer items-center gap-[10px] border border-green bg-green px-4 text-[11px] text-white hover:enabled:bg-green-dark disabled:cursor-not-allowed disabled:border-[#d7d9d0] disabled:bg-[#e9e9e2] disabled:text-[#999d93] max-[720px]:flex-1 max-[720px]:justify-center" disabled={!quizFinished} onClick={advanceCard}>
                Next question <ArrowRight size={15} />
              </button>
              <button className="min-h-[42px] cursor-pointer border-0 bg-transparent px-[10px] text-[10px] text-muted underline decoration-1 underline-offset-[3px] disabled:cursor-default disabled:text-[#b7bab1]" disabled={quizFinished} onClick={() => {
                setStudy((current) => ({ ...current, review: { ...current.review, [activeCard.id]: 'practice' } }));
                advanceCard();
              }}>Skip</button>
            </div>
          )}
        </section>
      </section>

      <footer className="flex min-h-[56px] items-center justify-between border-t border-line font-mono text-[8px] tracking-[.8px] text-muted max-[720px]:min-h-[48px]">
        <span>MAKE ROOM FOR CURIOSITY</span>
        <span className="font-sans text-[10px] tracking-normal">One card at a time <span className="ml-[5px] text-coral">✳</span></span>
      </footer>
    </main>
  );
}