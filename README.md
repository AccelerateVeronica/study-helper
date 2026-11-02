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

Create a production build with `npm run build`. The GH-300 questions and answer keys are in [`src/gh300Deck.ts`](src/gh300Deck.ts).
