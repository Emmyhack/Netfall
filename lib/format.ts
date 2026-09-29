import {
  abs,
  divide,
  isNegative,
  isValidDecimalString,
  isZero,
  round,
  type Money,
} from './money';

/**
 * Every monetary, rate, percentage and duration string in the UI is produced
 * here. Components never call toLocaleString or Intl directly.
 *
 * Money is grouped by hand rather than through Intl.NumberFormat, because
 * Intl takes a JavaScript number and we never turn a monetary value into one.
 */

export const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  USD: '$',
  USDT: '',
  USDC: '',
};

export const CURRENCY_DECIMALS: Readonly<Record<string, number>> = {
  NGN: 2,
  GHS: 2,
  KES: 2,
  USD: 2,
  USDT: 2,
  USDC: 2,
};

const GROUP_SEPARATOR = ',';
const DECIMAL_SEPARATOR = '.';
/** U+2212 minus sign — aligns with digit width, unlike a hyphen. */
const MINUS = '−';
const NBSP = ' ';

export function decimalsFor(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

export function symbolFor(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? '';
}

export function isAsset(currency: string): boolean {
  const c = currency.toUpperCase();
  return c === 'USDT' || c === 'USDC';
}

function groupInteger(digits: string): string {
  let out = '';
  for (let i = digits.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    out = digits.slice(start, i) + (out === '' ? '' : GROUP_SEPARATOR + out);
  }
  return out === '' ? '0' : out;
}

export interface NumberFormatOptions {
  decimals?: number;
  /** Drop the grouping separators. Used inside inputs. */
  plain?: boolean;
  /** Always show a sign, even when positive. */
  signDisplay?: 'auto' | 'always' | 'never';
}

/** Grouped decimal string. No symbol, no currency code. */
export function formatDecimal(value: Money, options: NumberFormatOptions = {}): string {
  if (!isValidDecimalString(value)) return '—';
  const decimals = options.decimals ?? 2;
  const rounded = round(abs(value), decimals);
  const [intPart = '0', fracPart] = rounded.split(DECIMAL_SEPARATOR);
  const grouped = options.plain ? intPart : groupInteger(intPart);
  const body = decimals > 0 && fracPart !== undefined ? grouped + DECIMAL_SEPARATOR + fracPart : grouped;

  const negative = isNegative(value);
  const signDisplay = options.signDisplay ?? 'auto';
  if (signDisplay === 'never') return body;
  if (negative) return MINUS + body;
  if (signDisplay === 'always') return '+' + body;
  return body;
}

export interface MoneyFormatOptions extends NumberFormatOptions {
  /** Append the asset ticker (USDT/USDC). Defaults to true for assets. */
  showCode?: boolean;
}

/**
 * Fiat gets a leading symbol; assets get a trailing ticker, because "621.87
 * USDT" is how holders read it and there is no accepted symbol.
 */
export function formatMoney(value: Money, currency: string, options: MoneyFormatOptions = {}): string {
  if (!isValidDecimalString(value)) return '—';
  const code = currency.toUpperCase();
  const decimals = options.decimals ?? decimalsFor(code);
  const body = formatDecimal(value, { ...options, decimals, signDisplay: 'never' });
  const negative = isNegative(value);
  const sign = options.signDisplay === 'always' && !negative ? '+' : negative ? MINUS : '';

  if (isAsset(code)) {
    const showCode = options.showCode ?? true;
    return showCode ? `${sign}${body}${NBSP}${code}` : `${sign}${body}`;
  }

  const symbol = symbolFor(code);
  if (symbol === '') return `${sign}${body}${NBSP}${code}`;
  return `${sign}${symbol}${body}`;
}

/**
 * Rates are shown inverted — "₦1,592.40 / USDT" — because nobody holds a
 * mental model of 0.000628 USDT per naira.
 */
export function formatEffectiveRate(
  effectiveRate: Money,
  fromCurrency: string,
  toCurrency: string,
): string {
  if (!isValidDecimalString(effectiveRate) || isZero(effectiveRate)) return '—';
  // Inversion is division, which lib/money owns.
  const inverted = divide('1', effectiveRate, 8);
  return `${formatMoney(inverted, fromCurrency, { decimals: 2 })}${NBSP}/${NBSP}${toCurrency.toUpperCase()}`;
}

/* -------------------------------------------------------------------------- */
/* Percentages and dispersion                                                  */
/* -------------------------------------------------------------------------- */

/** Basis points as a percentage: 280 -> "2.8%". */
export function formatBps(bps: number, decimals = 2): string {
  if (!Number.isFinite(bps)) return '—';
  const pct = bps / 100;
  const fixed = pct.toFixed(decimals);
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return `${trimmed === '' || trimmed === '-' ? '0' : trimmed}%`;
}

/** A 0..1 ratio as a percentage: 0.987 -> "98.7%". */
export function formatRatioPercent(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/* -------------------------------------------------------------------------- */
/* Durations and timestamps                                                    */
/* -------------------------------------------------------------------------- */

/** Settlement estimates. Approximate by nature, so phrased approximately. */
export function formatSettlement(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 90) return 'Under 2 min';
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) {
    const hours = seconds / 3600;
    return hours < 2 ? '~1 hr' : `~${Math.round(hours)} hr`;
  }
  const days = Math.round(seconds / 86_400);
  return days === 1 ? '~1 day' : `~${days} days`;
}

/** Remaining validity, e.g. "0:42". Returns null once expired. */
export function formatCountdown(msRemaining: number): string | null {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) return null;
  const total = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/* -------------------------------------------------------------------------- */
/* Input parsing                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Turns whatever a user typed into a decimal string, or null if there is no
 * number in it. Grouping separators and stray symbols are stripped; the result
 * stays a string the whole way through.
 */
export function parseAmountInput(raw: string): Money | null {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '') return null;
  const parts = cleaned.split('.');
  const intPart = (parts[0] ?? '').replace(/^0+(?=\d)/, '');
  const fracPart = parts.length > 1 ? parts.slice(1).join('') : undefined;
  const candidate = fracPart === undefined ? intPart || '0' : `${intPart || '0'}.${fracPart}`;
  return isValidDecimalString(candidate) ? candidate : null;
}

/** Grouped display for the amount field, preserving a trailing decimal point. */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  const firstDot = cleaned.indexOf('.');
  const intDigits = (firstDot === -1 ? cleaned : cleaned.slice(0, firstDot)).replace(/^0+(?=\d)/, '');
  const fracDigits = firstDot === -1 ? null : cleaned.slice(firstDot + 1).replace(/\./g, '');
  const grouped = groupInteger(intDigits === '' ? '0' : intDigits);
  if (fracDigits === null) return grouped;
  return `${grouped}.${fracDigits.slice(0, 2)}`;
}

/* -------------------------------------------------------------------------- */
/* Plain-language labels                                                       */
/* -------------------------------------------------------------------------- */

export function formatPaymentMethods(methods: readonly string[]): string {
  if (methods.length === 0) return '—';
  if (methods.length === 1) return methods[0] as string;
  if (methods.length === 2) return `${methods[0]} and ${methods[1]}`;
  return `${methods.slice(0, -1).join(', ')} and ${methods[methods.length - 1]}`;
}

