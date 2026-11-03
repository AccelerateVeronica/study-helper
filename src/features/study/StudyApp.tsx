import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, ListChecks, RotateCcw, Sparkles, X } from 'lucide-react';
import { flashcards } from './gh300Deck';

type ReviewState = Record<string, 'learned' | 'practice'>;
type StudyMode = 'flashcards' | 'quiz';
type SavedStudy = { currentIndex: number; review: ReviewState; skipped: string[]; mode: StudyMode };
type CategoryProgressMetric = 'total' | 'learned' | 'revisit' | 'skipped' | 'unseen' | 'reviewed';
type SelectedCategoryProgress = { category: string; metric: CategoryProgressMetric };

const categoryProgressMetricLabels: Record<CategoryProgressMetric, string> = {
  total: 'all',
  learned: 'learned',
  revisit: 'to revisit',
  skipped: 'skipped',
  unseen: 'unseen',
  reviewed: 'reviewed',
};

const STORAGE_KEY = 'fieldnotes-study-session';

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

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
      const skipped = Array.isArray(parsed.skipped)
        ? [...new Set(parsed.skipped.filter((id) =>
          typeof id === 'string' && flashcards.some((card) => card.id === id) && review[id] === undefined,
        ))]
        : [];
      const currentIndex = typeof parsed.currentIndex === 'number' && Number.isInteger(parsed.currentIndex)
        ? Math.max(0, Math.min(parsed.currentIndex, flashcards.length - 1))
        : 0;
      return { currentIndex, review, skipped, mode: parsed.mode === 'quiz' ? 'quiz' : 'flashcards' };
    }
  } catch {
    // Start with a fresh session if saved browser data is unavailable.
  }
  return { currentIndex: 0, review: {}, skipped: [], mode: 'flashcards' };
}

export default function App() {
  const [study, setStudy] = useState(readSavedStudy);
  const { currentIndex, review, skipped, mode } = study;
  const [quizSelections, setQuizSelections] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevisitListOpen, setIsRevisitListOpen] = useState(false);
  const [selectedCategoryProgress, setSelectedCategoryProgress] = useState<SelectedCategoryProgress | null>(null);
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
        ? flashcards.filter((card) => card.question.match(/^(T[1-6])Q\d+\./)?.[1] === quizCategory)
      : flashcards;
  const deckPosition = studyDeck.findIndex((card) => card.id === activeCard.id);
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
  const reviewedCount = Object.keys(review).length;
  const progress = ((reviewedCount + skipped.length) / flashcards.length) * 100;
  const quizAnsweredCount = Object.keys(quizResults).length;
  const quizAttemptedCount = quizAnsweredCount + quizSkippedIds.length;
  const quizRemainingCount = Math.max(0, studyDeck.length - quizAttemptedCount);
  const quizCorrectCount = Object.values(quizResults).filter(Boolean).length;
  const activeQuizChoices = quizChoiceOrders[activeCard.id] ?? activeCard.choices;
  const categoryProgress = Array.from({ length: 6 }, (_, index) => {
    const category = `T${index + 1}`;
    const cards = flashcards.filter((card) => card.question.match(/^(T[1-6])Q\d+\./)?.[1] === category);
    const learned = cards.filter((card) => review[card.id] === 'learned').length;
    const revisit = cards.filter((card) => review[card.id] === 'practice').length;
    const skippedCount = cards.filter((card) => skipped.includes(card.id)).length;
    const reviewed = learned + revisit;
    return {
      category,
      total: cards.length,
      learned,
      revisit,
      skipped: skippedCount,
      unseen: cards.length - reviewed - skippedCount,
      percent: cards.length > 0 ? Math.round((reviewed / cards.length) * 100) : 0,
    };
  });
  const selectedCategoryQuestions = selectedCategoryProgress
    ? flashcards.flatMap((card, index) => {
      const cardCategory = card.question.match(/^(T[1-6])Q\d+\./)?.[1];
      const status = review[card.id];
      const matchesMetric = selectedCategoryProgress.metric === 'total'
        || (selectedCategoryProgress.metric === 'learned' && status === 'learned')
        || (selectedCategoryProgress.metric === 'revisit' && status === 'practice')
        || (selectedCategoryProgress.metric === 'skipped' && skipped.includes(card.id))
        || (selectedCategoryProgress.metric === 'unseen' && !status && !skipped.includes(card.id))
        || (selectedCategoryProgress.metric === 'reviewed' && status !== undefined);
      return cardCategory === selectedCategoryProgress.category && matchesMetric ? [{ card, index }] : [];
    })
    : [];

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
      (card) => card.question.match(/^(T[1-6])Q\d+\./)?.[1] === category,
    );
    startQuiz(categoryCards, category);
  }

  function submitQuizAnswer(selections: string[]) {
    const isCorrect = selections.length === activeCard.answers.length
      && activeCard.answers.every((answer) => selections.includes(answer));
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
          <div className="flex items-center gap-[9px] whitespace-nowrap font-mono text-[9px] tracking-[.8px] text-[#82877d] max-[720px]:col-span-full"><span className="inline-block h-px w-5 bg-coral" /> YOUR STUDY DESK</div>
          <h1 className="mb-[14px] mt-[28px] font-display text-[clamp(39px,4vw,52px)] font-semibold leading-[1.09] tracking-[-.7px] max-[960px]:text-[43px] max-[720px]:col-span-full max-[720px]:mb-0 max-[720px]:mt-[15px] max-[720px]:text-[30px] max-[720px]:leading-[1.15]">A little{' '}<br className="max-[720px]:hidden" />closer to{' '}<br className="max-[720px]:hidden" /> <em className="font-semibold text-green">knowing.</em></h1>
          <p className="m-0 text-[13px] leading-[1.7] text-muted max-[720px]:hidden">Small steps make<br />strong memories.</p>

          <div className="mt-[60px] border-t border-line pt-[17px] max-[720px]:col-span-full max-[720px]:ml-0 max-[720px]:mt-4 max-[720px]:w-full max-[720px]:pt-3">
            <div className="flex justify-between font-mono text-[9px] tracking-[.8px] text-[#70766c] max-[720px]:text-[8px]">
              <span>SESSION PROGRESS</span>
              <span className="text-green">{reviewedCount + skipped.length}<span className="text-[#9c9e96]"> / {flashcards.length}</span></span>
            </div>
            <div className="mt-[13px] h-1 overflow-hidden bg-[#e7e7dd]" role="progressbar" aria-label="Session progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-green transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex flex-col gap-[9px] text-[11px] text-[#757b71] max-[720px]:mt-[10px] max-[720px]:flex-row max-[720px]:gap-4 max-[720px]:text-[10px] max-[380px]:gap-3 max-[380px]:text-[9px]">
              <span className="flex items-center gap-[7px] whitespace-nowrap max-[720px]:gap-1"><Check className="text-green max-[720px]:w-3" size={14} /> {learnedCount} learned</span>
              <button
                className="flex cursor-pointer items-center gap-[7px] border-0 bg-transparent p-0 text-left text-[#757b71] hover:text-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green max-[720px]:gap-1"
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

        <section className="w-full max-w-[570px] max-[720px]:max-w-none" aria-label="Flashcard study area">
          <div className="mb-5 flex items-center gap-[10px] max-[720px]:mb-[17px]">
          <div className="flex w-fit gap-[3px] bg-[#eae9e1] p-[3px]" role="tablist" aria-label="Study mode">
            <button role="tab" aria-selected={mode === 'flashcards'} className={`flex cursor-pointer items-center gap-[7px] border-0 bg-transparent px-3 py-2 text-[10px] text-[#757b71] ${mode === 'flashcards' ? 'bg-paper text-green-dark shadow-[0_1px_3px_#25332412]' : ''}`} onClick={() => changeMode('flashcards')}>
              <Layers size={15} /> Flashcards
            </button>
            <button role="tab" aria-selected={mode === 'quiz'} className={`flex cursor-pointer items-center gap-[7px] border-0 bg-transparent px-3 py-2 text-[10px] text-[#757b71] ${mode === 'quiz' ? 'bg-paper text-green-dark shadow-[0_1px_3px_#25332412]' : ''}`} onClick={() => changeMode('quiz')}>
              <ListChecks size={15} /> Quiz
            </button>
          </div>
          {(isRevisitMode || quizCategory) && (
            <button
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-1 py-2 text-[10px] text-[#757b71] underline decoration-1 underline-offset-2 hover:text-green-dark"
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
              <div className="h-1 overflow-hidden bg-[#e7e7dd]" role="progressbar" aria-label="Quiz progress" aria-valuenow={Math.round((quizAttemptedCount / studyDeck.length) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span className="block h-full bg-green transition-[width] duration-300" style={{ width: `${(quizAttemptedCount / studyDeck.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className={`relative min-h-[405px] max-[720px]:min-h-[410px] ${mode === 'quiz' && isQuizComplete ? 'hidden' : ''}`}>
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
                <span className="bg-[#f4f3ec] px-[9px] py-[5px] text-[9px] text-[#777e72]">{activeCard.subject}</span>
              </div>
              {mode === 'quiz' ? (
                <div className="flex flex-1 flex-col">
                  <h3 className="mb-[15px] mt-[22px] max-w-[420px] font-display text-[24px] font-semibold leading-[1.35] max-[720px]:mt-[21px] max-[720px]:text-[22px] max-[380px]:text-[20px]">{activeCard.question}</h3>
                  <div className="-mt-[7px] mb-[10px] font-mono text-[8px] tracking-[.7px] text-[#8c9187]">{activeCard.answers.length > 1 ? 'SELECT ALL THAT APPLY' : 'SELECT ONE ANSWER'}</div>
                  <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1 max-[720px]:gap-[7px]" role="list" aria-label="Answer choices">
                    {activeQuizChoices.map((choice, index) => {
                      const isSelected = quizSelections.includes(choice);
                      const isCorrectChoice = activeCard.answers.includes(choice);
                      const choiceClass = isSelected
                        ? isCorrectChoice
                          ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                          : 'border-[#e1b5a9] bg-[#fbefeb] text-[#a64e3c] hover:border-[#e1b5a9] hover:bg-[#fbefeb]'
                        : quizSubmitted && isCorrectChoice
                          ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                          : '';
                      const letterClass = isSelected && isCorrectChoice || quizSubmitted && isCorrectChoice
                        ? 'border-green bg-green text-white'
                        : isSelected && !isCorrectChoice ? 'border-coral bg-coral text-white' : '';
                      return (
                        <button
                          className={`relative flex min-h-[42px] cursor-pointer items-center gap-[9px] border border-[#e8e7df] bg-transparent px-[10px] py-2 pr-8 text-left text-[11px] transition-[border-color,background] duration-[160ms] hover:border-[#9cad92] hover:bg-[#fafbf7] disabled:cursor-default max-[720px]:min-h-[44px] ${choiceClass}`}
                          key={choice}
                          onClick={() => selectQuizChoice(choice)}
                          disabled={quizSubmitted}
                          aria-pressed={isSelected}
                        >
                          <span className={`grid size-[19px] flex-none place-items-center border border-[#e7e7df] font-mono text-[9px] text-[#868c80] ${letterClass}`}>{String.fromCharCode(65 + index)}</span>
                          <span>{choice}</span>
                          {quizSubmitted && isCorrectChoice && <Check className="absolute right-[10px]" size={14} />}
                          {isSelected && !isCorrectChoice && <X className="absolute right-[10px]" size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  {activeCard.answers.length > 1 && !quizSubmitted && (
                    <button
                      className="mt-3 min-h-[38px] w-fit cursor-pointer border border-green bg-green px-4 text-[10px] text-white hover:bg-green-dark disabled:cursor-not-allowed disabled:border-[#d7d9d0] disabled:bg-[#e9e9e2] disabled:text-[#999d93]"
                      type="button"
                      disabled={quizSelections.length === 0}
                      onClick={() => submitQuizAnswer(quizSelections)}
                    >
                      Check answer
                    </button>
                  )}
                  {quizSubmitted && (
                    <div className={`mt-3 flex flex-col gap-[5px] border-l-2 px-[10px] py-[9px] text-[10px] leading-[1.5] ${quizFeedbackTone}`} aria-live="polite">
                      <strong className="font-semibold">{quizAnswerCorrect ? 'Correct' : 'Not quite'}</strong>
                      {!quizAnswerCorrect && <span>Correct answer: {activeCard.answers.join(', ')}</span>}
                      {activeCard.explanation && <span className="text-[#72786f]">{activeCard.explanation}</span>}
                    </div>
                  )}
                </div>
              ) : !isRevealed ? (
                <div className="flex flex-1 flex-col">
                  <h3 className="mb-4 mt-[22px] max-w-[420px] font-display text-[24px] font-semibold leading-[1.35] max-[720px]:mt-[21px] max-[720px]:text-[22px] max-[380px]:text-[20px]">{activeCard.question}</h3>
                  {activeCard.answers.length > 1 && <div className="-mt-[7px] mb-[10px] font-mono text-[8px] tracking-[.7px] text-[#8c9187]">SELECT ALL THAT APPLY</div>}
                  <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1 max-[720px]:gap-[7px]" role="group" aria-label="Answer choices">
                    {activeCard.choices.map((choice, index) => (
                      <div
                        className="relative flex min-h-[42px] items-center gap-[9px] border border-[#e8e7df] bg-transparent px-[10px] py-2 text-left text-[11px] max-[720px]:min-h-[44px]"
                        key={choice}
                        role="listitem"
                      >
                        <span className="grid size-[19px] flex-none place-items-center border border-[#e7e7df] font-mono text-[9px] text-[#868c80]">{String.fromCharCode(65 + index)}</span>
                        <span>{choice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-[19px]">
                    <span className="text-[10px] text-[#969a91]">Tap card to reveal answer</span>
                    <ArrowRight className="text-green" size={15} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col pt-6">
                  <span className="grid size-[34px] place-items-center rounded-full bg-[#e9f0e5] text-green">
                    <Check size={19} />
                  </span>
                  <div className="mt-[13px] font-mono text-[9px] tracking-[.8px] text-[#8e9388]">THE CORRECT ANSWER</div>
                  <h3 className="my-2 font-display text-[28px] font-semibold">{activeCard.answers.join(', ')}</h3>
                  {activeCard.explanation && <p className="m-0 max-w-[410px] text-[12px] leading-[1.65] text-[#72786f]">{activeCard.explanation}</p>}
                  <button className="mt-3 flex w-fit cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-[10px] text-green" onClick={() => setIsRevealed(false)}>
                    <ArrowLeft size={14} /> Back to question
                  </button>
                  <div className="mt-auto flex items-center justify-between border-t border-[#efeee8] pt-[19px]">
                    <span className="text-[10px] text-[#969a91]">How well did it stick?</span>
                    <span className="font-mono text-[8px] tracking-[.8px] text-[#adb0a5]">SWIPE TO SORT</span>
                  </div>
                </div>
              )}
            </article>
            {mode === 'flashcards' && dragOffset > 24 && <div className="pointer-events-none absolute right-[22px] top-[72px] z-[3] flex rotate-[8deg] items-center gap-[5px] border-2 border-green px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-green">GOT IT <Check size={16} /></div>}
            {mode === 'flashcards' && dragOffset < -24 && <div className="pointer-events-none absolute left-[22px] top-[72px] z-[3] flex -rotate-[8deg] items-center gap-[5px] border-2 border-coral px-[9px] py-[6px] font-mono text-[10px] tracking-[.8px] text-coral">REVISIT <RotateCcw size={14} /></div>}
          </div>

          {mode === 'quiz' && isQuizComplete && (
            <article className="mt-4 flex min-h-[300px] flex-col items-center justify-center border border-[#ece9df] bg-paper px-6 py-10 text-center" aria-live="polite">
              <span className="grid size-[42px] place-items-center rounded-full bg-[#e9f0e5] text-green">
                <Check size={23} />
              </span>
              <h3 className="mb-1 mt-4 font-display text-[27px] font-semibold">Quiz complete</h3>
              <p className="mb-5 text-[12px] text-[#72786f]">
                You got {quizCorrectCount} of {studyDeck.length} questions correct ({Math.round((quizCorrectCount / studyDeck.length) * 100)}%).
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[10px] text-[#777e72]">
                <span>{quizAnsweredCount - quizCorrectCount} incorrect</span>
                <span>{quizSkippedIds.length} skipped</span>
              </div>
              <button
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 border border-green bg-green px-4 text-[11px] text-white hover:bg-green-dark"
                type="button"
                onClick={() => startQuiz(
                  quizCategory
                    ? flashcards.filter((card) => card.question.match(/^(T[1-6])Q\d+\./)?.[1] === quizCategory)
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
                <button className="flex h-[49px] min-w-[185px] cursor-pointer items-center gap-[10px] border border-[#e3c9c0] bg-transparent px-[13px] text-[11px] text-[#a55847] transition-colors hover:bg-[#f9ebe6] max-[720px]:h-[46px] max-[720px]:min-w-0 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:gap-[7px] max-[720px]:px-[9px] max-[720px]:text-[10px]" onClick={() => moveCard('practice')}>
                  <span className="grid size-[26px] place-items-center bg-[#f2e8e3] max-[720px]:size-[23px]"><RotateCcw size={16} /></span>
                  <span>Needs practice</span>
                  <span className="ml-auto font-mono text-[10px] text-[#a8a99f] max-[720px]:hidden">←</span>
                </button>
                <span className="font-mono text-[8px] text-[#b0b2a8] max-[720px]:text-[7px]">OR</span>
                <button className="flex h-[49px] min-w-[185px] cursor-pointer items-center gap-[10px] border border-[#cad7c7] bg-transparent px-[13px] text-[11px] text-green transition-colors hover:enabled:bg-[#eaf0e6] disabled:cursor-not-allowed disabled:opacity-[.43] max-[720px]:h-[46px] max-[720px]:min-w-0 max-[720px]:flex-1 max-[720px]:justify-center max-[720px]:gap-[7px] max-[720px]:px-[9px] max-[720px]:text-[10px]" onClick={() => moveCard('learned')} disabled={!isRevealed}>
                  <span className="grid size-[26px] place-items-center bg-[#e8eee5] max-[720px]:size-[23px]"><Check size={17} /></span>
                  <span>Got it</span>
                  <span className="ml-auto font-mono text-[10px] text-[#a8a99f] max-[720px]:hidden">→</span>
                </button>
              </div>
              <div className="mt-[15px] text-center text-[10px] text-[#92968d] max-[720px]:text-[9px]"><span className="mr-1 align-[-1px] text-[15px] text-green">↔</span> Swipe the card to sort it after checking your answer</div>
            </>
          ) : !isQuizComplete && (
            <div className="mt-[25px] flex items-center justify-center gap-[15px] max-[720px]:mt-[19px]">
              <button className="inline-flex min-h-[46px] cursor-pointer items-center gap-[10px] border border-green bg-green px-4 text-[11px] text-white hover:enabled:bg-green-dark disabled:cursor-not-allowed disabled:border-[#d7d9d0] disabled:bg-[#e9e9e2] disabled:text-[#999d93] max-[720px]:flex-1 max-[720px]:justify-center" disabled={!quizSubmitted} onClick={advanceCard}>
                {deckPosition === studyDeck.length - 1 ? 'See results' : 'Next question'} <ArrowRight size={15} />
              </button>
              <button className="min-h-[42px] cursor-pointer border-0 bg-transparent px-[10px] text-[10px] text-[#878d82] underline decoration-1 underline-offset-[3px] disabled:cursor-default disabled:text-[#b7bab1]" disabled={quizSubmitted} onClick={skipQuizQuestion}>Skip</button>
            </div>
          )}
        </section>
      </section>

      <section className="mx-auto mb-10 max-w-[1100px] border-t border-line pt-5" aria-labelledby="category-progress-heading">
        <h2 id="category-progress-heading" className="mb-4 text-[17px] font-medium">Progress by category</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-right text-[11px] tabular-nums">
            <caption className="sr-only">Study progress for categories T1 through T6. Reviewed includes learned and revisit cards; skipped is tracked separately.</caption>
            <thead className="border-b border-line text-[#70766c]">
              <tr>
                <th scope="col" className="px-2 py-3 text-left font-medium">Category</th>
                <th scope="col" className="px-2 py-3 font-medium">Total</th>
                <th scope="col" className="px-2 py-3 font-medium">Learned</th>
                <th scope="col" className="px-2 py-3 font-medium">Revisit</th>
                <th scope="col" className="px-2 py-3 font-medium">Skipped</th>
                <th scope="col" className="px-2 py-3 font-medium">Unseen</th>
                <th scope="col" className="px-2 py-3 font-medium">Reviewed</th>
                <th scope="col" className="px-2 py-3 text-left font-medium">Quiz</th>
              </tr>
            </thead>
            <tbody>
              {categoryProgress.map(({ category, total, learned, revisit, skipped: skippedCount, unseen, percent }) => {
                const metrics: { metric: CategoryProgressMetric; count: number; text: string }[] = [
                  { metric: 'total', count: total, text: String(total) },
                  { metric: 'learned', count: learned, text: String(learned) },
                  { metric: 'revisit', count: revisit, text: String(revisit) },
                  { metric: 'skipped', count: skippedCount, text: String(skippedCount) },
                  { metric: 'unseen', count: unseen, text: String(unseen) },
                  { metric: 'reviewed', count: learned + revisit, text: `${percent}%` },
                ];
                return (
                  <tr key={category} className="border-b border-line">
                    <th scope="row" className="px-2 py-3 text-left font-mono font-medium">{category}</th>
                    {metrics.map(({ metric, count, text }) => {
                      const isSelected = selectedCategoryProgress?.category === category
                        && selectedCategoryProgress.metric === metric;
                      const metricLabel = categoryProgressMetricLabels[metric];
                      return (
                        <td className={`px-2 py-3 ${metric === 'learned' ? 'text-green-dark' : metric === 'revisit' ? 'text-[#a55847]' : metric === 'unseen' ? 'text-muted' : ''}`} key={metric}>
                          <button
                            className={`cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-dotted underline-offset-2 hover:text-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${isSelected ? 'font-semibold text-green-dark' : ''}`}
                            type="button"
                            aria-label={`View ${count} ${metricLabel} question${count === 1 ? '' : 's'} in ${category}`}
                            aria-expanded={isSelected}
                            aria-controls="category-question-list"
                            onClick={() => setSelectedCategoryProgress((current) =>
                              current?.category === category && current.metric === metric ? null : { category, metric },
                            )}
                          >
                            {text}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-left">
                      <button
                        className="cursor-pointer border-0 bg-transparent p-0 text-[10px] text-green-dark underline decoration-dotted underline-offset-2 hover:text-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green disabled:cursor-not-allowed disabled:text-muted"
                        type="button"
                        disabled={total === 0}
                        onClick={() => startCategoryQuiz(category)}
                        aria-label={`Start quiz for ${category}`}
                      >
                        Start quiz
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectedCategoryProgress && (
          <div id="category-question-list" className="mt-4 border-y border-line py-3" aria-labelledby="category-question-heading">
            <h3 id="category-question-heading" className="mb-2 text-[12px] font-medium">
              {selectedCategoryProgress.category} · {categoryProgressMetricLabels[selectedCategoryProgress.metric]} questions
            </h3>
            {selectedCategoryQuestions.length === 0 ? (
              <p className="my-2 text-[11px] text-muted">No questions match this progress count yet.</p>
            ) : (
              <ul className="m-0 max-h-[280px] list-none overflow-y-auto p-0">
                {selectedCategoryQuestions.map(({ card, index }) => (
                  <li className="border-b border-line last:border-b-0" key={card.id}>
                    <button
                      className="w-full cursor-pointer border-0 bg-transparent px-2 py-3 text-left text-[11px] leading-[1.5] text-ink hover:bg-[#f5f5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-green"
                      type="button"
                      onClick={() => viewStudyCard(index)}
                    >
                      {card.question}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <footer className="flex min-h-[56px] items-center justify-between border-t border-line font-mono text-[8px] tracking-[.8px] text-[#989b91] max-[720px]:min-h-[48px]">
        <span>MAKE ROOM FOR CURIOSITY</span>
        <span className="font-sans text-[10px] tracking-normal">One card at a time <span className="ml-[5px] text-coral">✳</span></span>
      </footer>
    </main>
  );
}