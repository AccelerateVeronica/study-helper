import { flashcards, type Flashcard } from './gh300Deck';

export type ReviewState = Record<string, 'learned' | 'practice'>;
export type StudyMode = 'flashcards' | 'quiz';
export type SavedStudy = { currentIndex: number; review: ReviewState; skipped: string[]; mode: StudyMode };

export const STORAGE_KEY = 'fieldnotes-study-session';

export function getCardCategory(card: Flashcard): string | undefined {
  return card.question.match(/^(T[1-6])Q\d+\./)?.[1];
}

export function isAnswerCorrect(card: Flashcard, selections: readonly string[]): boolean {
  return selections.length === card.answers.length
    && card.answers.every((answer) => selections.includes(answer));
}

export function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function readSavedStudy(): SavedStudy {
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
