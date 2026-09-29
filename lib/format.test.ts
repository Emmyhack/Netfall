import { describe, expect, it } from 'vitest';
import {
  formatAmountInput,
  formatBps,
  formatCountdown,
  formatDecimal,
  formatEffectiveRate,
  formatMoney,
  formatPaymentMethods,
  formatRatioPercent,
  formatSettlement,
  parseAmountInput,
} from './format';

const MINUS = '−';
const NBSP = ' ';

describe('formatDecimal', () => {
  it('groups thousands', () => {
    expect(formatDecimal('500000', { decimals: 0 })).toBe('500,000');
    expect(formatDecimal('1234567.891', { decimals: 2 })).toBe('1,234,567.89');
    expect(formatDecimal('100', { decimals: 2 })).toBe('100.00');
  });

  it('uses a true minus sign so columns stay aligned', () => {
    expect(formatDecimal('-42.5', { decimals: 2 })).toBe(`${MINUS}42.50`);
  });

  it('returns an em dash for anything that is not a decimal string', () => {
    expect(formatDecimal('not a number')).toBe('—');
    expect(formatDecimal('')).toBe('—');
  });

  it('never loses precision to a float', () => {
    // 9007199254740993 is not representable as a JS number.
    expect(formatDecimal('9007199254740993', { decimals: 0 })).toBe('9,007,199,254,740,993');
  });
});

describe('formatMoney', () => {
  it('puts a symbol before fiat', () => {
    expect(formatMoney('498100', 'NGN')).toBe('₦498,100.00');
    expect(formatMoney('5000', 'GHS')).toBe('GH₵5,000.00');
    expect(formatMoney('50000', 'KES')).toBe('KSh50,000.00');
  });

  it('puts the ticker after an asset', () => {
    expect(formatMoney('316.38', 'USDT')).toBe(`316.38${NBSP}USDT`);
    expect(formatMoney('316.38', 'USDC', { showCode: false })).toBe('316.38');
  });

  it('signs negative deductions', () => {
    expect(formatMoney('-3.79', 'USDT')).toBe(`${MINUS}3.79${NBSP}USDT`);
  });
});

describe('formatEffectiveRate', () => {
  it('inverts the rate into the direction people quote in', () => {
    // 0.000625 USDT per naira is 1,600 naira per USDT.
    expect(formatEffectiveRate('0.000625', 'NGN', 'USDT')).toBe(
      `₦1,600.00${NBSP}/${NBSP}USDT`,
    );
  });

  it('refuses to divide by zero', () => {
    expect(formatEffectiveRate('0', 'NGN', 'USDT')).toBe('—');
  });
});

describe('percentages', () => {
  it('renders basis points as a percentage without trailing zeros', () => {
    expect(formatBps(310)).toBe('3.1%');
    expect(formatBps(279)).toBe('2.79%');
    expect(formatBps(0)).toBe('0%');
  });

  it('renders a 0..1 ratio', () => {
    expect(formatRatioPercent(0.982)).toBe('98.2%');
    expect(formatRatioPercent(1)).toBe('100.0%');
  });
});

describe('durations', () => {
  it('describes settlement approximately', () => {
    expect(formatSettlement(45)).toBe('Under 2 min');
    expect(formatSettlement(600)).toBe('~10 min');
    expect(formatSettlement(3600)).toBe('~1 hr');
    expect(formatSettlement(10_800)).toBe('~3 hr');
    expect(formatSettlement(172_800)).toBe('~2 days');
  });

  it('counts down and then reports expiry by returning null', () => {
    expect(formatCountdown(62_000)).toBe('1:02');
    expect(formatCountdown(5_000)).toBe('0:05');
    expect(formatCountdown(0)).toBeNull();
    expect(formatCountdown(-1)).toBeNull();
  });
});

describe('amount input', () => {
  it('extracts a decimal string from whatever was typed', () => {
    expect(parseAmountInput('₦500,000')).toBe('500000');
    expect(parseAmountInput('1,234.56')).toBe('1234.56');
    expect(parseAmountInput('007')).toBe('7');
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('')).toBeNull();
  });

  it('groups as the user types, keeping a trailing decimal point', () => {
    expect(formatAmountInput('500000')).toBe('500,000');
    expect(formatAmountInput('1234.5')).toBe('1,234.5');
    expect(formatAmountInput('1234.')).toBe('1,234.');
    expect(formatAmountInput('')).toBe('');
  });
});

describe('payment methods', () => {
  it('reads as a sentence', () => {
    expect(formatPaymentMethods(['M-Pesa'])).toBe('M-Pesa');
    expect(formatPaymentMethods(['M-Pesa', 'Bank transfer'])).toBe('M-Pesa and Bank transfer');
    expect(formatPaymentMethods(['Card', 'USSD', 'Bank transfer'])).toBe(
      'Card, USSD and Bank transfer',
    );
    expect(formatPaymentMethods([])).toBe('—');
  });
});
