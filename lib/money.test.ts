import { describe, expect, it } from 'vitest';
import {
  add,
  compare,
  dispersionBps,
  divide,
  isValidDecimalString,
  maxOf,
  minOf,
  multiply,
  positionRatio,
  reconcileBreakdown,
  round,
  subtract,
  sum,
} from './money';

describe('decimal string validation', () => {
  it('accepts well-formed decimals', () => {
    for (const v of ['0', '-0', '1', '1.5', '-1.5', '1580.40', '0.000000001']) {
      expect(isValidDecimalString(v)).toBe(true);
    }
  });

  it('rejects anything that is not a plain decimal string', () => {
    for (const v of ['', ' ', 'abc', '1,000', '1e5', '.5', '1.', '+1', 1 as unknown, null, undefined]) {
      expect(isValidDecimalString(v)).toBe(false);
    }
  });

  it('throws rather than coercing a bad value', () => {
    expect(() => add('1', '1e5')).toThrow(TypeError);
  });
});

describe('arithmetic is exact', () => {
  it('adds values that float arithmetic gets wrong', () => {
    // 0.1 + 0.2 === 0.30000000000000004 as a JS number.
    expect(add('0.1', '0.2')).toBe('0.3');
  });

  it('keeps precision across a large naira figure', () => {
    expect(subtract('500000000.01', '0.01')).toBe('500000000');
    expect(multiply('1580.40', '0.0001')).toBe('0.15804');
  });

  it('sums a ledger without drift', () => {
    const lines = Array.from({ length: 1000 }, () => '0.01');
    expect(sum(lines)).toBe('10');
  });

  it('divides to a requested scale', () => {
    expect(divide('500000', '1580.40', 8)).toBe('316.37560111');
  });

  it('rounds half to even', () => {
    expect(round('2.345', 2)).toBe('2.34');
    expect(round('2.355', 2)).toBe('2.36');
  });
});

describe('comparison', () => {
  it('orders numerically, not lexically', () => {
    expect(compare('9', '10')).toBe(-1);
    expect(compare('100.10', '100.1')).toBe(0);
  });

  it('finds extremes', () => {
    const values = ['498100.00', '512400.00', '505000.00'];
    expect(maxOf(values)).toBe('512400.00');
    expect(minOf(values)).toBe('498100.00');
    expect(maxOf([])).toBeNull();
  });
});

describe('dispersion', () => {
  it('measures the gap as a share of the best amount', () => {
    // (512400 - 498100) / 512400 = 2.79%
    expect(dispersionBps(['512400', '498100'])).toBe(279);
  });

  it('is zero when every provider lands the same amount', () => {
    expect(dispersionBps(['100', '100', '100'])).toBe(0);
  });

  it('is zero with nothing to compare', () => {
    expect(dispersionBps([])).toBe(0);
    expect(dispersionBps(['100'])).toBe(0);
  });
});

describe('positionRatio', () => {
  it('maps worst to 0 and best to 1', () => {
    expect(positionRatio('100', '100', '200')).toBe(0);
    expect(positionRatio('200', '100', '200')).toBe(1);
    expect(positionRatio('150', '100', '200')).toBeCloseTo(0.5, 10);
  });

  it('centres a collapsed range rather than dividing by zero', () => {
    expect(positionRatio('100', '100', '100')).toBe(0.5);
  });

  it('clamps values outside the range', () => {
    expect(positionRatio('50', '100', '200')).toBe(0);
    expect(positionRatio('500', '100', '200')).toBe(1);
  });
});

describe('breakdown reconciliation', () => {
  const usdt = (amount: string) => ({ amount, currency: 'USDT' });

  it('passes when the lines sum to the landed amount', () => {
    const lines = [usdt('316.38'), usdt('-3.79'), usdt('-1.42'), usdt('-0.50')];
    expect(reconcileBreakdown(lines, '310.67')).toEqual({ ok: true });
  });

  it('fails loudly when they do not', () => {
    const lines = [usdt('316.38'), usdt('-3.79')];
    const result = reconcileBreakdown(lines, '300.00');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('mismatch');
  });

  it('refuses a mixed-currency ledger', () => {
    const result = reconcileBreakdown([usdt('1'), { amount: '-1', currency: 'NGN' }], '0');
    expect(result).toMatchObject({ ok: false, reason: 'mixed_currency' });
  });

  it('refuses an empty ledger', () => {
    expect(reconcileBreakdown([], '0')).toEqual({ ok: false, reason: 'empty' });
  });
});
