'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { ChevronDown, ExternalLink } from './icons';
import {
  formatEffectiveRate,
  formatMoney,
  formatRatioPercent,
  formatSettlement,
} from '@/lib/format';
import type { Quote } from '@/lib/types';
import { ApproximationSign, ConfidenceMarker } from './ConfidenceMarker';
import { SourceLabel } from './SourceLabel';
import { buttonClass } from './ui/Button';
import { QUOTE_ROW, QUOTE_ROW_CONTENT_HEIGHT } from './quoteGrid';

/** Loaded when a row is expanded, not before. */
const FeeBreakdown = dynamic(() => import('./FeeBreakdown').then((m) => m.FeeBreakdown), {
  ssr: false,
  loading: () => <div className="h-40" aria-hidden="true" />,
});

export interface QuoteRowProps {
  quote: Quote;
  rank: number;
  isBest: boolean;
  inputAmount: string;
  fromCurrency: string;
  toCurrency: string;
  /** Shortfall against the best landed amount, in the destination asset. */
  shortfall: string | null;
  expired?: boolean;
}

/**
 * One provider. Below ~800px of container width this stacks into a card with
 * every value labelled; above it, the same markup becomes a table row.
 */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="qcell">
      <span className="qcell-label" aria-hidden="true">
        {label}
      </span>
      <span className="sr-only">{label}: </span>
      {children}
    </div>
  );
}

export function QuoteRow({
  quote,
  rank,
  isBest,
  inputAmount,
  fromCurrency,
  toCurrency,
  shortfall,
  expired = false,
}: QuoteRowProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <li
      className={[
        'border-b border-rule bg-surface last:border-b-0',
        isBest ? 'border-l-[3px] border-l-best bg-best-soft' : 'border-l-[3px] border-l-transparent',
      ].join(' ')}
    >
      <div className={QUOTE_ROW}>
        {/* Provider */}
        <div
          className="flex min-w-0 flex-col justify-center"
          style={{ minHeight: QUOTE_ROW_CONTENT_HEIGHT }}
        >
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="numeric shrink-0 text-xs text-ink-3" aria-hidden="true">
              {rank}
            </span>
            <span className="truncate text-lg font-medium text-ink">{quote.providerName}</span>
            {isBest && (
              <span className="shrink-0 rounded-pill border border-best px-2 py-px text-xs font-semibold text-best">
                Best
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-px">
            <SourceLabel source={quote.source} />
            {quote.hasCommercialRelationship && (
              <span
                className="text-xs text-ink-3"
                title="Netfall earns a commission if you use this provider. It does not affect where they rank."
              >
                We earn a commission
              </span>
            )}
          </div>
        </div>

        <Cell label="Rate">
          <span className="numeric truncate text-sm text-ink-2">
            {formatEffectiveRate(quote.effectiveRate, fromCurrency, toCurrency)}
          </span>
        </Cell>

        <Cell label="Settles in">
          <span className="truncate text-sm text-ink-2">
            {formatSettlement(quote.settlementEstimateSeconds)}
          </span>
        </Cell>

        <Cell label="Completed in the last 30 days">
          <span
            className="numeric truncate text-sm text-ink-2"
            title="Share of transfers that completed in the last 30 days."
          >
            {formatRatioPercent(quote.successRate30d)}
          </span>
        </Cell>

        {/* Landed amount — the figure the whole product exists to report */}
        <div className="qamount">
          <span className="qcell-label" aria-hidden="true">
            What you&rsquo;ll receive
          </span>
          <span className="sr-only">What you&rsquo;ll receive: </span>
          <span
            className={[
              'numeric text-2xl',
              isBest ? 'font-semibold text-best' : 'font-medium text-ink',
              expired ? 'line-through decoration-ink-3' : '',
            ].join(' ')}
          >
            <ApproximationSign confidence={quote.confidence} />
            {formatMoney(quote.landedAmount, toCurrency, { showCode: false })}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <ConfidenceMarker confidence={quote.confidence} />
            {shortfall && (
              <span className="numeric text-xs text-ink-3">
                {formatMoney(shortfall, toCurrency, { showCode: false })} less
              </span>
            )}
          </span>
        </div>

        <div className="qactions">
          <a
            href={quote.routeUrl}
            target="_blank"
            rel={
              quote.hasCommercialRelationship
                ? 'noopener noreferrer sponsored'
                : 'noopener noreferrer'
            }
            className={buttonClass(isBest ? 'best' : 'secondary', 'sm', 'qaction-primary')}
          >
            <span className="truncate">Go to {quote.providerName}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>

          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className={buttonClass('ghost', 'sm', 'shrink-0')}
          >
            <span className="hidden sm:inline">{expanded ? 'Hide' : 'Costs'}</span>
            <ChevronDown
              className={['h-4 w-4 transition-transform', expanded ? 'rotate-180' : ''].join(' ')}
            />
            <span className="sr-only">
              {expanded ? 'Hide' : 'Show'} the cost breakdown for {quote.providerName}
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="animate-expand-down border-t border-rule bg-surface-2 px-4 py-5 sm:px-5">
          <FeeBreakdown
            id={panelId}
            quote={quote}
            inputAmount={inputAmount}
            fromCurrency={fromCurrency}
          />
        </div>
      )}
    </li>
  );
}
