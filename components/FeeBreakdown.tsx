import { formatMoney, formatPaymentMethods, formatSettlement } from '@/lib/format';
import { reconcileBreakdown } from '@/lib/money';
import type { Quote } from '@/lib/types';
import { confidenceExplanation } from './ConfidenceMarker';

export interface FeeBreakdownProps {
  quote: Quote;
  inputAmount: string;
  fromCurrency: string;
  id?: string;
}

/**
 * The Wise pattern: what you send, every deduction named in plain language,
 * what arrives.
 *
 * The ledger is denominated in the asset you receive, including the provider's
 * rate margin. Quoting the margin as a fee is the whole argument — it is the
 * cost providers hide inside a headline rate.
 *
 * If the lines do not sum to the landed amount we render an error instead. A
 * breakdown that does not reconcile is worse than no breakdown at all.
 */
export function FeeBreakdown({ quote, inputAmount, fromCurrency, id }: FeeBreakdownProps) {
  const reconciliation = reconcileBreakdown(quote.feeBreakdown, quote.landedAmount);

  if (!reconciliation.ok) {
    return (
      <div
        id={id}
        role="alert"
        className="rounded border border-caution bg-caution-soft p-3 text-sm text-caution"
      >
        <p className="font-semibold">This breakdown does not add up.</p>
        <p className="mt-1 max-w-content">
          {reconciliation.reason === 'mixed_currency'
            ? `The itemised costs arrived in more than one currency (${reconciliation.currencies.join(', ')}), so we cannot show a single total you can check.`
            : reconciliation.reason === 'empty'
              ? 'This provider returned a landed amount with no itemised costs behind it.'
              : `The itemised costs come to ${formatMoney(reconciliation.expected, currencyOf(quote))}, but the provider reports ${formatMoney(reconciliation.actual, currencyOf(quote))} landing.`}
        </p>
        <p className="mt-2 max-w-content">
          We have left the figures as the provider sent them rather than adjusting one to fit the
          other. Check the amount on their own site before you send anything.
        </p>
      </div>
    );
  }

  const [reference, ...deductions] = quote.feeBreakdown;
  const currency = currencyOf(quote);

  return (
    <div id={id} className="text-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Cost breakdown for {quote.providerName}, from what you send to what arrives.
        </caption>
        <tbody>
          <tr>
            <th scope="row" className="py-1 text-left font-normal text-ink-2">
              You send
            </th>
            <td className="numeric py-1 text-right text-ink">
              {formatMoney(inputAmount, fromCurrency)}
            </td>
          </tr>

          {reference && (
            <tr className="border-t border-rule">
              <th scope="row" className="py-1 text-left font-normal text-ink-2">
                {reference.label}
              </th>
              <td className="numeric py-1 text-right text-ink">
                {formatMoney(reference.amount, reference.currency)}
              </td>
            </tr>
          )}

          {deductions.map((line, index) => (
            <tr key={`${line.label}-${index}`}>
              <th scope="row" className="py-1 text-left font-normal text-ink-2">
                {line.label}
              </th>
              <td className="numeric py-1 text-right text-ink-2">
                {formatMoney(line.amount, line.currency)}
              </td>
            </tr>
          ))}

          <tr className="border-t border-rule-2">
            <th scope="row" className="py-2 text-left font-semibold text-ink">
              What you&rsquo;ll receive
            </th>
            <td className="numeric py-2 text-right font-semibold text-ink">
              {formatMoney(quote.landedAmount, currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <dl className="mt-3 grid gap-x-6 gap-y-1 border-t border-rule pt-3 sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-xs text-ink-3">Pay with</dt>
          <dd className="text-sm text-ink-2">{formatPaymentMethods(quote.paymentMethods)}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-xs text-ink-3">Typically settles in</dt>
          <dd className="text-sm text-ink-2">
            {formatSettlement(quote.settlementEstimateSeconds)}
          </dd>
        </div>
      </dl>

      {quote.confidence !== 'exact' && (
        <p className="mt-3 max-w-content border-t border-rule pt-3 text-xs text-caution">
          {confidenceExplanation(quote.confidence)}
        </p>
      )}
    </div>
  );
}

function currencyOf(quote: Quote): string {
  return quote.feeBreakdown[0]?.currency ?? '';
}
