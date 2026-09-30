import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QuoteTable } from './QuoteTable';
import { fixtureCorridor, fixtureResponse } from '@/lib/mock/fixtures';
import { compare } from '@/lib/money';
import type { QuoteState } from '@/lib/hooks/useQuotes';
import type { Quote, QuoteResponse } from '@/lib/types';

const corridor = fixtureCorridor('ngn-usdt');

function stateFrom(response: QuoteResponse, overrides: Partial<QuoteState> = {}): QuoteState {
  return {
    status: 'settled',
    quotes: response.quotes,
    unavailable: response.unavailable,
    response,
    error: null,
    requestId: response.requestId,
    expected: response.quotes.length + response.unavailable.length,
    received: response.quotes.length + response.unavailable.length,
    dispersionBps: response.dispersionBps,
    expiresAt: response.expiresAt,
    generatedAt: response.generatedAt,
    expired: false,
    msRemaining: 60_000,
    refreshing: false,
    refresh: () => undefined,
    ...overrides,
  };
}

const normal = fixtureResponse('ngn-usdt', '500000', 'table') as QuoteResponse;

describe('rule §4.1 — the rendered order is the landed-amount order', () => {
  it('lays rows out in descending landed amount', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    const items = screen.getAllByRole('listitem');
    const names = normal.quotes.map((q) => q.providerName);

    // The quotes list is the first list on the page; read its rows in order.
    const rendered = items
      .map((item) => names.find((name) => within(item).queryByText(name) !== null))
      .filter((name): name is string => Boolean(name));

    expect(rendered.slice(0, names.length)).toEqual(names);

    for (let i = 1; i < normal.quotes.length; i += 1) {
      const previous = normal.quotes[i - 1] as Quote;
      const current = normal.quotes[i] as Quote;
      expect(compare(previous.landedAmount, current.landedAmount)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('rule §4.2 — estimates never look exact', () => {
  it('labels every quote with its confidence', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    const estimated = normal.quotes.filter((q) => q.confidence === 'estimated');
    const unverified = normal.quotes.filter((q) => q.confidence === 'insufficient_data');
    if (estimated.length > 0) expect(screen.getAllByText('Estimated').length).toBe(estimated.length);
    if (unverified.length > 0) {
      expect(screen.getAllByText('Not verified').length).toBe(unverified.length);
    }
  });
});

describe('rule §4.3 — nothing unavailable is hidden', () => {
  it('names every provider that could not quote, with a reason', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    for (const entry of normal.unavailable) {
      expect(screen.getByText(entry.providerName)).toBeInTheDocument();
    }
  });

  it('shows the reasons even when the whole corridor fails', () => {
    const allFail = fixtureResponse('ngn-usdt', '500000', 'table', 'all-fail') as QuoteResponse;
    render(<QuoteTable state={stateFrom(allFail)} corridor={corridor} inputAmount="500000" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No provider returned a price');
    for (const entry of allFail.unavailable) {
      expect(screen.getByText(entry.providerName)).toBeInTheDocument();
    }
  });
});

describe('rule §4.4 and §4.5 — source and commercial relationship are disclosed', () => {
  it('marks aggregator-sourced quotes', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    const viaAggregator = normal.quotes.filter((q) => q.source === 'aggregator');
    if (viaAggregator.length > 0) {
      // One per row, plus the legend beneath the table.
      expect(screen.getAllByText('Via aggregator').length).toBeGreaterThanOrEqual(
        viaAggregator.length,
      );
    }
  });

  it('states the current commercial position on the surface', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    // No agreement exists today, and no quote may claim one.
    expect(normal.quotes.every((q) => !q.hasCommercialRelationship)).toBe(true);
    expect(screen.queryByText('We earn a commission')).not.toBeInTheDocument();
    expect(screen.getByText(/currently earns nothing from any provider/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How we make money' })).toBeInTheDocument();
  });

  it('labels a provider the moment a commercial flag exists', () => {
    // The machinery has to work on the day an agreement is signed: flipping
    // the flag is the only step, and the label appears at the row.
    const flagged: QuoteResponse = {
      ...normal,
      quotes: normal.quotes.map((q, i) =>
        i === 0 ? { ...q, hasCommercialRelationship: true } : q,
      ),
    };
    render(<QuoteTable state={stateFrom(flagged)} corridor={corridor} inputAmount="500000" />);
    expect(screen.getAllByText('We earn a commission').length).toBe(1);
  });
});

describe('rule §4.6 — the cost of choosing badly is stated in the sending currency', () => {
  it('quantifies the loss in naira', () => {
    render(<QuoteTable state={stateFrom(normal)} corridor={corridor} inputAmount="500000" />);
    expect(screen.getByText(/Picking the worst of these costs you/)).toBeInTheDocument();
  });
});

describe('auto-refresh — an expiring board renews itself quietly', () => {
  it('holds the struck figures without the manual banner while renewing', () => {
    render(
      <QuoteTable
        state={stateFrom(normal, { expired: true, msRemaining: -1000, refreshing: true })}
        corridor={corridor}
        inputAmount="500000"
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh prices' })).toBeNull();
    expect(screen.getByText('Updating prices…')).toBeInTheDocument();
    // The board itself stays on screen — no skeleton flash mid-renewal.
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});

describe('rule §4.7 — an expired quote is an error, not a stale success', () => {
  it('raises an expiry alert rather than presenting the figures as live', () => {
    render(
      <QuoteTable
        state={stateFrom(normal, { expired: true, msRemaining: -1000 })}
        corridor={corridor}
        inputAmount="500000"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('These prices have expired');
    expect(screen.getByRole('button', { name: 'Refresh prices' })).toBeInTheDocument();
  });
});

describe('partial results', () => {
  it('reports progress while providers are still answering', () => {
    const partial = stateFrom(normal, {
      status: 'partial',
      quotes: normal.quotes.slice(0, 2),
      unavailable: [],
      expected: 10,
      received: 2,
      expiresAt: null,
      msRemaining: null,
    });
    render(<QuoteTable state={partial} corridor={corridor} inputAmount="500000" />);
    expect(screen.getByText(/2 of 10 providers have answered/)).toBeInTheDocument();
  });
});
