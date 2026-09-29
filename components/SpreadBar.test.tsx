import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpreadBar } from './SpreadBar';
import type { SpreadBarQuote } from './SpreadBar';

const quote = (provider: string, landedAmount: string): SpreadBarQuote => ({
  provider,
  providerName: provider,
  landedAmount,
  confidence: 'exact',
});

describe('SpreadBar', () => {
  it('describes the range for screen readers rather than leaving an SVG', () => {
    render(
      <SpreadBar
        quotes={[quote('best', '512400'), quote('mid', '505000'), quote('worst', '498100')]}
        assetCurrency="USDT"
      />,
    );
    expect(
      screen.getByText(/range from 498,100.00 USDT with worst to 512,400.00 USDT with best/),
    ).toBeInTheDocument();
  });

  it('states the loss in the sending currency when it can convert', () => {
    render(
      <SpreadBar
        quotes={[quote('best', '314.73'), quote('worst', '303.46')]}
        assetCurrency="USDT"
        fiatCurrency="NGN"
        bestEffectiveRate="0.00062946"
      />,
    );
    // 11.27 USDT at the best rate is about ₦17,904.
    expect(screen.getByText(/You could lose ₦17,9/)).toBeInTheDocument();
  });

  it('says so plainly when every provider lands the same amount', () => {
    render(<SpreadBar quotes={[quote('a', '100'), quote('b', '100')]} assetCurrency="USDT" />);
    expect(screen.getByText('Every provider lands the same amount')).toBeInTheDocument();
  });

  it('says so plainly when there is nothing to compare against', () => {
    render(<SpreadBar quotes={[quote('a', '100')]} assetCurrency="USDT" />);
    expect(screen.getByText(/Only one provider is quoting/)).toBeInTheDocument();
  });

  it('renders nothing plottable without quotes', () => {
    render(<SpreadBar quotes={[]} assetCurrency="USDT" />);
    expect(screen.getByText('No quotes to plot yet.')).toBeInTheDocument();
  });
});
