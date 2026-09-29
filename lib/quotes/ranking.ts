import { compare, subtract, type Money } from '../money';
import type { Quote } from '../types';

/**
 * Rule §4.1, in one function.
 *
 * Quotes are ordered by landed amount, descending, and by nothing else. Not
 * by commercial relationship, not by confidence, not by whether we reached
 * the provider directly. Ties keep their arrival order, which is arbitrary but
 * not a preference.
 *
 * lib/quotes/engine.test.ts holds this to its word.
 */
export function rankQuotes(quotes: readonly Quote[]): Quote[] {
  return [...quotes].sort((a, b) => compare(b.landedAmount, a.landedAmount));
}

/** How much less each quote lands than the best one. Null for the best itself. */
export function shortfalls(rankedQuotes: readonly Quote[]): (Money | null)[] {
  const best = rankedQuotes[0];
  if (!best) return [];
  return rankedQuotes.map((quote, index) => {
    if (index === 0) return null;
    const gap = subtract(best.landedAmount, quote.landedAmount);
    return compare(gap, '0') === 0 ? null : gap;
  });
}
