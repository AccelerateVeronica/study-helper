import { useState } from 'react';
import { flashcards } from './gh300Deck';
import { getCardCategory, type ReviewState } from './studySession';

type CategoryProgressMetric = 'total' | 'learned' | 'revisit' | 'skipped' | 'unseen' | 'reviewed';
type SelectedCategoryProgress = { category: string; metric: CategoryProgressMetric };

interface CategoryProgressProps {
  readonly review: ReviewState;
  readonly skipped: readonly string[];
  readonly onViewCard: (index: number) => void;
  readonly onStartQuiz: (category: string) => void;
}

const metricLabels: Record<CategoryProgressMetric, string> = {
  total: 'all',
  learned: 'learned',
  revisit: 'to revisit',
  skipped: 'skipped',
  unseen: 'unseen',
  reviewed: 'reviewed',
};

export function CategoryProgress({ review, skipped, onViewCard, onStartQuiz }: CategoryProgressProps) {
  const [selectedProgress, setSelectedProgress] = useState<SelectedCategoryProgress | null>(null);
  const categoryProgress = Array.from({ length: 6 }, (_, index) => {
    const category = `T${index + 1}`;
    const cards = flashcards.filter((card) => getCardCategory(card) === category);
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
  const selectedQuestions = selectedProgress
    ? flashcards.flatMap((card, index) => {
      const status = review[card.id];
      const matchesMetric = selectedProgress.metric === 'total'
        || (selectedProgress.metric === 'learned' && status === 'learned')
        || (selectedProgress.metric === 'revisit' && status === 'practice')
        || (selectedProgress.metric === 'skipped' && skipped.includes(card.id))
        || (selectedProgress.metric === 'unseen' && !status && !skipped.includes(card.id))
        || (selectedProgress.metric === 'reviewed' && status !== undefined);
      return getCardCategory(card) === selectedProgress.category && matchesMetric ? [{ card, index }] : [];
    })
    : [];

  return (
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
                    const isSelected = selectedProgress?.category === category
                      && selectedProgress.metric === metric;
                    const metricLabel = metricLabels[metric];
                    return (
                      <td className={`px-2 py-3 ${metric === 'learned' ? 'text-green-dark' : metric === 'revisit' ? 'text-[#a55847]' : metric === 'unseen' ? 'text-muted' : ''}`} key={metric}>
                        <button
                          className={`cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-dotted underline-offset-2 hover:text-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${isSelected ? 'font-semibold text-green-dark' : ''}`}
                          type="button"
                          aria-label={`View ${count} ${metricLabel} question${count === 1 ? '' : 's'} in ${category}`}
                          aria-expanded={isSelected}
                          aria-controls="category-question-list"
                          onClick={() => setSelectedProgress((current) =>
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
                      onClick={() => onStartQuiz(category)}
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
      {selectedProgress && (
        <div id="category-question-list" className="mt-4 border-y border-line py-3" aria-labelledby="category-question-heading">
          <h3 id="category-question-heading" className="mb-2 text-[12px] font-medium">
            {selectedProgress.category} · {metricLabels[selectedProgress.metric]} questions
          </h3>
          {selectedQuestions.length === 0 ? (
            <p className="my-2 text-[11px] text-muted">No questions match this progress count yet.</p>
          ) : (
            <ul className="m-0 max-h-[280px] list-none overflow-y-auto p-0">
              {selectedQuestions.map(({ card, index }) => (
                <li className="border-b border-line last:border-b-0" key={card.id}>
                  <button
                    className="w-full cursor-pointer border-0 bg-transparent px-2 py-3 text-left text-[11px] leading-[1.5] text-ink hover:bg-[#f5f5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-green"
                    type="button"
                    onClick={() => onViewCard(index)}
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
  );
}
