import { Check, X } from 'lucide-react';
import type { Flashcard } from './gh300Deck';
import { isAnswerCorrect } from './studySession';

interface QuizQuestionProps {
  readonly card: Flashcard;
  readonly choices: readonly string[];
  readonly selections: readonly string[];
  readonly submitted: boolean;
  readonly onSelectChoice: (choice: string) => void;
  readonly onSubmit: () => void;
}

export function QuizQuestion({ card, choices, selections, submitted, onSelectChoice, onSubmit }: QuizQuestionProps) {
  const answerCorrect = isAnswerCorrect(card, selections);
  const hasIncorrectChoice = selections.some((choice) => !card.answers.includes(choice));
  const feedbackTone = answerCorrect
    ? 'border-green bg-[#f0f4ed] text-green-dark'
    : hasIncorrectChoice || card.answers.length === 1
      ? 'border-coral bg-[#fbf3ef] text-[#935342]'
      : 'border-[#d9d9cf] bg-[#f4f3ec] text-[#697066]';

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="mb-4 mt-6 text-[23px] font-semibold leading-[1.45] tracking-[-.5px] max-[720px]:text-[20px]">{card.question}</h3>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span>{card.answers.length > 1 ? 'Select all that apply' : 'Select one answer'}</span>
        {card.answers.length > 1 && <span className="rounded-full bg-[#f0f3f5] px-2.5 py-1 font-mono text-[10px]">{selections.length} selected</span>}
      </div>
      <div className="grid grid-cols-1 gap-2.5" role="group" aria-label="Answer choices">
        {choices.map((choice, index) => {
          const isSelected = selections.includes(choice);
          const isCorrectChoice = card.answers.includes(choice);
          const choiceClass = !submitted
            ? isSelected ? 'border-[#9cad92] bg-[#f4f3ec] hover:bg-[#f4f3ec]' : ''
            : isSelected
              ? isCorrectChoice
                ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                : 'border-[#e1b5a9] bg-[#fbefeb] text-[#a64e3c] hover:border-[#e1b5a9] hover:bg-[#fbefeb]'
              : isCorrectChoice
                ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
                : '';
          const letterClass = !submitted
            ? isSelected ? 'border-[#697066] bg-[#697066] text-white' : ''
            : isCorrectChoice
              ? 'border-green bg-green text-white'
              : isSelected ? 'border-coral bg-coral text-white' : '';
          return (
            <button
              className={`answer-choice cursor-pointer pr-10 transition-[border-color,background] duration-[160ms] hover:border-[#9cad92] hover:bg-[#fafbf7] disabled:cursor-default ${choiceClass}`}
              key={choice}
              onClick={() => onSelectChoice(choice)}
              disabled={submitted}
              aria-pressed={isSelected}
            >
              <span className={`choice-letter ${letterClass}`}>{String.fromCharCode(65 + index)}</span>
              <span>{choice}</span>
              {submitted && isCorrectChoice && <Check className="absolute right-[10px]" size={14} />}
              {submitted && isSelected && !isCorrectChoice && <X className="absolute right-[10px]" size={14} />}
            </button>
          );
        })}
      </div>
      {card.answers.length > 1 && !submitted && (
        <button
          className="primary-action mt-4 w-fit max-[720px]:w-full"
          type="button"
          disabled={selections.length === 0}
          onClick={onSubmit}
        >
          Check answer
        </button>
      )}
      {submitted && (
        <div className={`mt-4 flex flex-col gap-2 rounded-xl border-l-2 px-4 py-3 text-[13px] leading-relaxed ${feedbackTone}`} aria-live="polite">
          <strong className="font-semibold">{answerCorrect ? 'Correct' : 'Not quite'}</strong>
          {!answerCorrect && <span>Correct answer: {card.answers.join(', ')}</span>}
          {card.explanation && <span className="text-[#72786f]">{card.explanation}</span>}
        </div>
      )}
    </div>
  );
}
