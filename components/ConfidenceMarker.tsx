import type { Confidence } from '@/lib/types';

/**
 * Rule §4.2: the three confidence levels must be visibly distinguishable, and
 * colour alone never carries the meaning — every level is spelled out in words.
 */
const LEVELS: Readonly<
  Record<Confidence, { label: string; explanation: string; className: string; approximate: boolean }>
> = {
  exact: {
    label: 'Exact',
    explanation: 'Priced from a live quote for this amount.',
    className: 'border-rule text-ink-3',
    approximate: false,
  },
  estimated: {
    label: 'Estimated',
    explanation:
      'Modelled from this provider’s recent pricing rather than a live quote. What you receive may differ.',
    className: 'border-caution bg-caution-soft text-caution',
    approximate: true,
  },
  insufficient_data: {
    label: 'Not verified',
    explanation:
      'We could not confirm this provider’s current pricing. Treat the figure as indicative only and check it on their site.',
    className: 'border-caution bg-caution-soft text-caution',
    approximate: true,
  },
};

export function confidenceIsApproximate(confidence: Confidence): boolean {
  return LEVELS[confidence].approximate;
}

export function confidenceLabel(confidence: Confidence): string {
  return LEVELS[confidence].label;
}

export function confidenceExplanation(confidence: Confidence): string {
  return LEVELS[confidence].explanation;
}

export function ConfidenceMarker({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  const level = LEVELS[confidence];
  return (
    <span
      className={[
        'inline-flex items-center rounded-pill border px-2 py-px text-xs font-medium',
        level.className,
        className ?? '',
      ].join(' ')}
      title={level.explanation}
    >
      {level.label}
    </span>
  );
}

/**
 * The approximation sign that precedes any figure we cannot vouch for. It sits
 * in the numeric column so an estimate can never be mistaken for an exact
 * figure at a glance.
 */
export function ApproximationSign({ confidence }: { confidence: Confidence }) {
  if (!LEVELS[confidence].approximate) return null;
  return (
    <span aria-hidden="true" className="text-caution">
      {'≈'}
    </span>
  );
}
