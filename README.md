# Study Helper

A React and TypeScript study app for the GH-300 question bank, with 121 multiple-choice questions.

## Study modes

- **Flashcards:** choose one or more options, reveal the answer, then mark the card as learned or needing practice. Swipe right for learned and left for more practice.
- **Quiz:** tap an answer to see immediate feedback. Questions can have one or multiple correct answers; there is no submit button.

The app saves your current deck position, review progress, and selected mode in browser localStorage.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. The GH-300 questions and answer keys are in [`src/features/study/gh300Deck.ts`](src/features/study/gh300Deck.ts).

## Code structure

- [`StudyApp.tsx`](src/features/study/StudyApp.tsx) coordinates study navigation, quiz sessions, and flashcard interactions.
- [`QuizQuestion.tsx`](src/features/study/QuizQuestion.tsx) renders quiz choices, answer submission, and feedback.
- [`CategoryProgress.tsx`](src/features/study/CategoryProgress.tsx) owns category counts, question-list filtering, and category quiz actions.
- [`studySession.ts`](src/features/study/studySession.ts) provides saved-session loading, shared types, category parsing, answer grading, and shuffling.
