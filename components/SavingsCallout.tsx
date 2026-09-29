import { formatBps, formatMoney } from '@/lib/format';
import { divide, isZero, subtract, type Money } from '@/lib/money';
import type { Quote } from '@/lib/types';
import { confidenceIsApproximate } from './ConfidenceMarker';

/**
 * Rule §4.6: state what choosing badly costs, in the currency the user is
 * sending, not in the asset they will hold.
 *
 * The fiat figure is the shortfall in the asset valued at the best available
 * rate: the extra you would have to send through the worst provider to end up
 * with what the best one gives you.
 */
export function SavingsCallout({
  quotes,
  fromCurrency,
  toCurrency,
  dispersionBps,
  className,
}: {
  quotes: readonly Quote[];
  fromCurrency: string;
  toCurrency: string;
  dispersionBps: number;
  className?: string;
}) {
  if (quotes.length < 2) return null;

  const best = quotes[0] as Quote;
  const worst = quotes[quotes.length - 1] as Quote;
  const gap: Money = subtract(best.landedAmount, worst.landedAmount);

  if (isZero(gap)) {
    return (
      <p className={['text-sm text-ink-2', className ?? ''].join(' ')}>
        Every provider quoting right now lands the same amount. Choose on settlement time and
        reliability instead.
      </p>
    );
  }

  const gapInFiat = isZero(best.effectiveRate) ? null : divide(gap, best.effectiveRate, 2);

  return (
    <div
      className={[
        'rounded-card border border-rule bg-surface p-6',
        className ?? '',
      ].join(' ')}
    >
      <p className="text-lg text-ink">
        <span className="font-semibold">
          Picking the worst of these costs you{' '}
          {gapInFiat
            ? formatMoney(gapInFiat, fromCurrency, { decimals: 0 })
            : formatMoney(gap, toCurrency)}
          .
        </span>{' '}
        <span className="text-ink-2">
          {worst.providerName} lands {formatMoney(gap, toCurrency)} less than {best.providerName} on
          this amount — a spread of {formatBps(dispersionBps)} across {quotes.length} providers.
        </span>
      </p>

      {confidenceIsApproximate(best.confidence) && (
        <p className="mt-2 max-w-content text-sm text-caution">
          The top-ranked figure is {best.confidence === 'estimated' ? 'an estimate' : 'unverified'},
          so treat this comparison as indicative. Ranking is by landed amount regardless of how
          confident we are in it.
        </p>
      )}
    </div>
  );
}
