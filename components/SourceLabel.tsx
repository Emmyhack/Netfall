import type { QuoteSource } from '@/lib/types';

/**
 * Rule §4.4: a quote reached through an aggregator is labelled as one. The
 * difference matters — an aggregator adds its own margin and its own failure
 * modes between us and the provider actually holding the liquidity.
 */
const SOURCES: Readonly<Record<QuoteSource, { label: string; explanation: string }>> = {
  direct: {
    label: 'Direct',
    explanation: 'Quoted by the provider directly through their own pricing API.',
  },
  aggregator: {
    label: 'Via aggregator',
    explanation:
      'Reached through an aggregator rather than a direct integration. The aggregator sets the final price.',
  },
};

export function SourceLabel({ source, className }: { source: QuoteSource; className?: string }) {
  const entry = SOURCES[source];
  return (
    <span className={['text-xs text-ink-3', className ?? ''].join(' ')} title={entry.explanation}>
      {entry.label}
    </span>
  );
}

export function sourceLabelText(source: QuoteSource): string {
  return SOURCES[source].label;
}
