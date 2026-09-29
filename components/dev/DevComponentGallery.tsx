'use client';

import { useState } from 'react';
import { ConfidenceMarker } from '@/components/ConfidenceMarker';
import { CodeSnippet } from '@/components/CodeSnippet';
import { CorridorSelector } from '@/components/CorridorSelector';
import { DisclosureNotice } from '@/components/DisclosureNotice';
import { FeeBreakdown } from '@/components/FeeBreakdown';
import { HighTicketInterceptor } from '@/components/HighTicketInterceptor';
import { QuoteRow } from '@/components/QuoteRow';
import { RateAlertForm } from '@/components/RateAlertForm';
import { SavingsCallout } from '@/components/SavingsCallout';
import { SourceLabel } from '@/components/SourceLabel';
import { SpreadBar } from '@/components/SpreadBar';
import { UnavailableList } from '@/components/UnavailableList';
import { CorridorUnsupported } from '@/components/states/CorridorUnsupported';
import { QuoteError } from '@/components/states/QuoteError';
import { QuoteExpired } from '@/components/states/QuoteExpired';
import { QuoteTableSkeleton } from '@/components/states/QuoteTableSkeleton';
import { getCorridor } from '@/lib/corridors';
import { fixtureCorridor, fixtureResponse } from '@/lib/mock/fixtures';
import { multiply } from '@/lib/money';
import { shortfalls } from '@/lib/quotes/ranking';
import type { Quote, QuoteErrorCode, UnavailableQuote } from '@/lib/types';
import { DevCase, DevSection } from './DevSection';

const corridor = fixtureCorridor('ngn-usdt');
const normal = fixtureResponse('ngn-usdt', '500000', 'gallery');
const flat = fixtureResponse('ngn-usdt', '500000', 'gallery', 'zero-dispersion');
const extreme = fixtureResponse('ngn-usdt', '500000', 'gallery', 'extreme-dispersion');
const single = fixtureResponse('ngn-usdt', '500000', 'gallery', 'single-provider');
const allFail = fixtureResponse('ngn-usdt', '500000', 'gallery', 'all-fail');

const quotes: Quote[] = normal?.quotes ?? [];
const gaps = shortfalls(quotes);

/** A ledger that deliberately does not reconcile, to exercise the error path. */
const brokenQuote: Quote | null = quotes[0]
  ? {
      ...(quotes[0] as Quote),
      provider: 'broken',
      providerName: 'Broken Ledger Co',
      feeBreakdown: [
        { label: 'Amount at mid-market rate', amount: '316.38', currency: 'USDT' },
        { label: 'Provider rate margin', amount: '-3.79', currency: 'USDT' },
      ],
      landedAmount: '299.00',
    }
  : null;

const ERROR_CODES: QuoteErrorCode[] = [
  'corridor_unsupported',
  'amount_invalid',
  'amount_below_minimum',
  'amount_above_maximum',
  'all_providers_failed',
  'network',
];

const UNAVAILABLE_ALL: UnavailableQuote[] = [
  { provider: 'a', providerName: 'Below the floor', reason: 'below_minimum' },
  { provider: 'b', providerName: 'Over the ceiling', reason: 'above_maximum' },
  { provider: 'c', providerName: 'Timed out', reason: 'timeout' },
  { provider: 'd', providerName: 'Not in this corridor', reason: 'corridor_unsupported' },
  { provider: 'e', providerName: 'Service down', reason: 'provider_down' },
  { provider: 'f', providerName: 'Garbled price', reason: 'insufficient_data' },
];

export function DevComponentGallery() {
  const [amountInput, setAmountInput] = useState('500,000');
  const [selectorCorridor, setSelectorCorridor] = useState('ngn-usdt');

  return (
    <div>
      <h1 className="text-display text-ink">Component gallery</h1>
      <p className="mt-5 max-w-content text-lg text-ink-2">
        Every component in isolation, at the states it has to survive. Switch the theme in the
        header and resize the window; nothing here is allowed to break at 360px.
      </p>

      <DevSection
        title="SpreadBar"
        note="The signature element. Below 420px it drops its ticks for a two-endpoint form rather than crushing them."
      >
        <DevCase label="Full, normal dispersion">
          {normal && <Bar quotes={normal.quotes} />}
        </DevCase>
        <DevCase label="Compact">{normal && <Bar quotes={normal.quotes} compact />}</DevCase>
        <DevCase label="Extreme dispersion">{extreme && <Bar quotes={extreme.quotes} />}</DevCase>
        <DevCase label="Zero dispersion">{flat && <Bar quotes={flat.quotes} />}</DevCase>
        <DevCase label="Single provider">{single && <Bar quotes={single.quotes} />}</DevCase>
        <DevCase label="No quotes">
          <SpreadBar quotes={[]} assetCurrency={corridor.to} />
        </DevCase>
        <DevCase label="Constrained to 320px">
          <div style={{ width: 320 }}>{normal && <Bar quotes={normal.quotes} />}</div>
        </DevCase>
      </DevSection>

      <DevSection title="CorridorSelector" note="Debounced 300ms and writes to the URL in situ.">
        <DevCase label="Default">
          <CorridorSelector
            corridor={getCorridor(selectorCorridor) ?? corridor}
            amountInput={amountInput}
            onAmountChange={setAmountInput}
            onCorridorChange={setSelectorCorridor}
          />
        </DevCase>
      </DevSection>

      <DevSection title="QuoteRow" note="Stacks into a card below 640px. Expand to see the ledger.">
        {quotes.slice(0, 3).map((quote, index) => (
          <DevCase key={quote.provider} label={index === 0 ? 'Best' : `Rank ${index + 1}`}>
            <ol className="overflow-hidden rounded-card border border-rule">
              <QuoteRow
                quote={quote}
                rank={index + 1}
                isBest={index === 0}
                inputAmount="500000"
                fromCurrency={corridor.from}
                toCurrency={corridor.to}
                shortfall={gaps[index] ?? null}
              />
            </ol>
          </DevCase>
        ))}
        <DevCase label="Expired — figures struck through">
          {quotes[0] && (
            <ol className="overflow-hidden rounded-card border border-rule">
              <QuoteRow
                quote={quotes[0]}
                rank={1}
                isBest
                inputAmount="500000"
                fromCurrency={corridor.from}
                toCurrency={corridor.to}
                shortfall={null}
                expired
              />
            </ol>
          )}
        </DevCase>
      </DevSection>

      <DevSection
        title="FeeBreakdown"
        note="Denominated in what you receive, rate margin included as a line item. Renders an error rather than a breakdown that does not add up."
      >
        {quotes[0] && (
          <DevCase label="Reconciles">
            <FeeBreakdown quote={quotes[0]} inputAmount="500000" fromCurrency={corridor.from} />
          </DevCase>
        )}
        {brokenQuote && (
          <DevCase label="Does not reconcile">
            <FeeBreakdown quote={brokenQuote} inputAmount="500000" fromCurrency={corridor.from} />
          </DevCase>
        )}
        {quotes[0] && (
          <DevCase label="Mixed currencies">
            <FeeBreakdown
              quote={{
                ...quotes[0],
                feeBreakdown: [
                  { label: 'Amount at mid-market rate', amount: '316.38', currency: 'USDT' },
                  { label: 'Bank charge', amount: '-500', currency: 'NGN' },
                ],
              }}
              inputAmount="500000"
              fromCurrency={corridor.from}
            />
          </DevCase>
        )}
        {quotes[0] && (
          <DevCase label="Empty ledger">
            <FeeBreakdown
              quote={{ ...quotes[0], feeBreakdown: [] }}
              inputAmount="500000"
              fromCurrency={corridor.from}
            />
          </DevCase>
        )}
      </DevSection>

      <DevSection title="ConfidenceMarker and SourceLabel" note="Text and colour, never colour alone.">
        <DevCase label="All levels">
          <div className="flex flex-wrap items-center gap-4">
            <ConfidenceMarker confidence="exact" />
            <ConfidenceMarker confidence="estimated" />
            <ConfidenceMarker confidence="insufficient_data" />
            <SourceLabel source="direct" />
            <SourceLabel source="aggregator" />
          </div>
        </DevCase>
      </DevSection>

      <DevSection title="SavingsCallout">
        {normal && (
          <DevCase label="Normal">
            <SavingsCallout
              quotes={normal.quotes}
              fromCurrency={corridor.from}
              toCurrency={corridor.to}
              dispersionBps={normal.dispersionBps}
            />
          </DevCase>
        )}
        {flat && (
          <DevCase label="Zero dispersion">
            <SavingsCallout
              quotes={flat.quotes}
              fromCurrency={corridor.from}
              toCurrency={corridor.to}
              dispersionBps={0}
            />
          </DevCase>
        )}
      </DevSection>

      <DevSection title="UnavailableList" note="Absence is information. Every reason has its own copy.">
        <DevCase label="Every reason">
          <UnavailableList entries={UNAVAILABLE_ALL} corridor={corridor} />
        </DevCase>
        {allFail && (
          <DevCase label="Whole corridor down">
            <UnavailableList entries={allFail.unavailable} corridor={corridor} />
          </DevCase>
        )}
      </DevSection>

      <DevSection title="DisclosureNotice">
        <DevCase label="Inline">
          <DisclosureNotice />
        </DevCase>
        <DevCase label="Block">
          <DisclosureNotice variant="block" />
        </DevCase>
      </DevSection>

      <DevSection title="States" note="Built before the happy path was polished, because they are the common case.">
        <DevCase label="Loading skeleton">
          <div className="rounded border border-rule">
            <QuoteTableSkeleton rows={4} />
          </div>
        </DevCase>
        {ERROR_CODES.map((code) => (
          <DevCase key={code} label={`Error: ${code}`}>
            <QuoteError
              error={{
                code,
                message: 'The engine reported this failure.',
                ...(code === 'corridor_unsupported' ? { suggestion: 'ngn-usdt' } : {}),
              }}
              onRetry={() => undefined}
            />
          </DevCase>
        ))}
        <DevCase label="Expired">
          <QuoteExpired generatedAt={new Date(Date.now() - 180_000).toISOString()} onRefresh={() => undefined} />
        </DevCase>
        <DevCase label="Corridor unsupported">
          <CorridorUnsupported requested="zar-usdt" nearest={corridor} />
        </DevCase>
      </DevSection>

      <DevSection title="HighTicketInterceptor" note="Revenue-critical. Same care as the table.">
        <DevCase label="Over the threshold">
          <HighTicketInterceptor corridor={corridor} amount={multiply(corridor.otcThreshold, '3')} />
        </DevCase>
      </DevSection>

      <DevSection title="RateAlertForm" note="Persists to this browser only.">
        <DevCase label="Default">
          <RateAlertForm defaultCorridor="ngn-usdt" />
        </DevCase>
      </DevSection>

      <DevSection title="CodeSnippet">
        <DevCase label="bash">
          <CodeSnippet code={'curl https://api.netfall.io/v1/quote \\\n  -d corridor=NGN-USDT'} language="bash" />
        </DevCase>
        <DevCase label="json">
          <CodeSnippet code={'{\n  "landedAmount": "314.73",\n  "confidence": "exact"\n}'} language="json" />
        </DevCase>
      </DevSection>
    </div>
  );
}

function Bar({ quotes: barQuotes, compact }: { quotes: Quote[]; compact?: boolean }) {
  return (
    <SpreadBar
      variant={compact ? 'compact' : 'full'}
      quotes={barQuotes}
      assetCurrency={corridor.to}
      fiatCurrency={corridor.from}
      bestEffectiveRate={barQuotes[0]?.effectiveRate}
    />
  );
}
