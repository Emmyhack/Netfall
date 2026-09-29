import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeeBreakdown } from './FeeBreakdown';
import { fixtureResponse } from '@/lib/mock/fixtures';
import type { Quote } from '@/lib/types';

const response = fixtureResponse('ngn-usdt', '500000', 'feebreakdown');
const quote = response?.quotes[0] as Quote;

describe('FeeBreakdown', () => {
  it('itemises the ledger from what you send to what arrives', () => {
    render(<FeeBreakdown quote={quote} inputAmount="500000" fromCurrency="NGN" />);
    expect(screen.getByText('You send')).toBeInTheDocument();
    expect(screen.getByText('Amount at mid-market rate')).toBeInTheDocument();
    expect(screen.getByText(/What you.ll receive/)).toBeInTheDocument();
  });

  it('names the rate margin as a cost rather than burying it in the rate', () => {
    render(<FeeBreakdown quote={quote} inputAmount="500000" fromCurrency="NGN" />);
    expect(screen.getByText('Provider rate margin')).toBeInTheDocument();
  });

  it('refuses to render a breakdown that does not add up', () => {
    const broken: Quote = {
      ...quote,
      landedAmount: '1.00',
      feeBreakdown: [
        { label: 'Amount at mid-market rate', amount: '316.38', currency: 'USDT' },
        { label: 'Provider rate margin', amount: '-3.79', currency: 'USDT' },
      ],
    };
    render(<FeeBreakdown quote={broken} inputAmount="500000" fromCurrency="NGN" />);
    expect(screen.getByRole('alert')).toHaveTextContent('does not add up');
    expect(screen.queryByText('You send')).not.toBeInTheDocument();
  });

  it('refuses a ledger that mixes currencies', () => {
    const mixed: Quote = {
      ...quote,
      feeBreakdown: [
        { label: 'Amount at mid-market rate', amount: '316.38', currency: 'USDT' },
        { label: 'Bank charge', amount: '-500', currency: 'NGN' },
      ],
    };
    render(<FeeBreakdown quote={mixed} inputAmount="500000" fromCurrency="NGN" />);
    expect(screen.getByRole('alert')).toHaveTextContent('more than one currency');
  });

  it('refuses a landed amount with no costs behind it', () => {
    render(
      <FeeBreakdown
        quote={{ ...quote, feeBreakdown: [] }}
        inputAmount="500000"
        fromCurrency="NGN"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('no itemised costs');
  });

  it('repeats the confidence caveat inside the breakdown', () => {
    render(
      <FeeBreakdown
        quote={{ ...quote, confidence: 'estimated' }}
        inputAmount="500000"
        fromCurrency="NGN"
      />,
    );
    expect(screen.getByText(/Modelled from/)).toBeInTheDocument();
  });
});
