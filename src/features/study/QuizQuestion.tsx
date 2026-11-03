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
      <h3 className="mb-[15px] mt-[22px] max-w-[420px] font-display text-[24px] font-semibold leading-[1.35] max-[720px]:mt-[21px] max-[720px]:text-[22px] max-[380px]:text-[20px]">{card.question}</h3>
      <div className="-mt-[7px] mb-[10px] font-mono text-[8px] tracking-[.7px] text-[#8c9187]">{card.answers.length > 1 ? 'SELECT ALL THAT APPLY' : 'SELECT ONE ANSWER'}</div>
      <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1 max-[720px]:gap-[7px]" role="list" aria-label="Answer choices">
        {choices.map((choice, index) => {
          const isSelected = selections.includes(choice);
          const isCorrectChoice = card.answers.includes(choice);
          const choiceClass = isSelected
            ? isCorrectChoice
              ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
              : 'border-[#e1b5a9] bg-[#fbefeb] text-[#a64e3c] hover:border-[#e1b5a9] hover:bg-[#fbefeb]'
            : submitted && isCorrectChoice
              ? 'border-[#b7c9b0] bg-[#edf3e9] text-green-dark hover:border-[#b7c9b0] hover:bg-[#edf3e9]'
              : '';
          const letterClass = isSelected && isCorrectChoice || submitted && isCorrectChoice
            ? 'border-green bg-green text-white'
            : isSelected && !isCorrectChoice ? 'border-coral bg-coral text-white' : '';
          return (
            <button
              className={`relative flex min-h-[42px] cursor-pointer items-center gap-[9px] border border-[#e8e7df] bg-transparent px-[10px] py-2 pr-8 text-left text-[11px] transition-[border-color,background] duration-[160ms] hover:border-[#9cad92] hover:bg-[#fafbf7] disabled:cursor-default max-[720px]:min-h-[44px] ${choiceClass}`}
              key={choice}
              onClick={() => onSelectChoice(choice)}
              disabled={submitted}
              aria-pressed={isSelected}
            >
              <span className={`grid size-[19px] flex-none place-items-center border border-[#e7e7df] font-mono text-[9px] text-[#868c80] ${letterClass}`}>{String.fromCharCode(65 + index)}</span>
              <span>{choice}</span>
              {submitted && isCorrectChoice && <Check className="absolute right-[10px]" size={14} />}
              {isSelected && !isCorrectChoice && <X className="absolute right-[10px]" size={14} />}
            </button>
          );
        })}
      </div>
      {card.answers.length > 1 && !submitted && (
        <button
          className="mt-3 min-h-[38px] w-fit cursor-pointer border border-green bg-green px-4 text-[10px] text-white hover:bg-green-dark disabled:cursor-not-allowed disabled:border-[#d7d9d0] disabled:bg-[#e9e9e2] disabled:text-[#999d93]"
          type="button"
          disabled={selections.length === 0}
          onClick={onSubmit}
        >
          Check answer
        </button>
      )}
      {submitted && (
        <div className={`mt-3 flex flex-col gap-[5px] border-l-2 px-[10px] py-[9px] text-[10px] leading-[1.5] ${feedbackTone}`} aria-live="polite">
          <strong className="font-semibold">{answerCorrect ? 'Correct' : 'Not quite'}</strong>
          {!answerCorrect && <span>Correct answer: {card.answers.join(', ')}</span>}
          {card.explanation && <span className="text-[#72786f]">{card.explanation}</span>}
        </div>
      )}
    </div>
  );
}
