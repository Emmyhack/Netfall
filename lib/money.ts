import Decimal from 'decimal.js-light';

/**
 * Every monetary operation in Netfall goes through this module.
 *
 * Values cross module boundaries as decimal strings and are only ever a
 * Decimal in the middle of a calculation here. A floating-point rounding error
 * in a product whose entire claim is numeric honesty is not an acceptable bug,
 * so nothing outside this file converts money to a JavaScript number.
 */

// decimal.js-light rather than the full build: it carries every operation
// below at a third of the bundle cost, and the behaviour is identical.
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -30, toExpPos: 40 });

export type Money = string;

const DECIMAL_PATTERN = /^-?(?:\d+)(?:\.\d+)?$/;

export function isValidDecimalString(value: unknown): value is Money {
  return typeof value === 'string' && value.trim() !== '' && DECIMAL_PATTERN.test(value.trim());
}

/** Throws on anything that is not a clean decimal string. Fail loudly. */
function toDecimal(value: Money): Decimal {
  if (!isValidDecimalString(value)) {
    throw new TypeError(`Not a decimal string: ${JSON.stringify(value)}`);
  }
  return new Decimal(value.trim());
}

export function normalise(value: Money): Money {
  return toDecimal(value).toFixed();
}

export function add(a: Money, b: Money): Money {
  return toDecimal(a).plus(toDecimal(b)).toFixed();
}

export function subtract(a: Money, b: Money): Money {
  return toDecimal(a).minus(toDecimal(b)).toFixed();
}

export function multiply(a: Money, b: Money): Money {
  return toDecimal(a).times(toDecimal(b)).toFixed();
}

export function divide(a: Money, b: Money, decimalPlaces = 18): Money {
  const divisor = toDecimal(b);
  if (divisor.isZero()) throw new RangeError('Division by zero');
  return toDecimal(a).dividedBy(divisor).toDecimalPlaces(decimalPlaces).toFixed();
}

export function sum(values: readonly Money[]): Money {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)).toFixed();
}

export function negate(value: Money): Money {
  return toDecimal(value).negated().toFixed();
}

export function abs(value: Money): Money {
  return toDecimal(value).abs().toFixed();
}

export function round(value: Money, decimalPlaces: number): Money {
  return toDecimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_EVEN).toFixed(decimalPlaces);
}

/** -1, 0 or 1. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(toDecimal(b)) as -1 | 0 | 1;
}

export const equals = (a: Money, b: Money): boolean => compare(a, b) === 0;
export const greaterThan = (a: Money, b: Money): boolean => compare(a, b) === 1;
export const greaterThanOrEqual = (a: Money, b: Money): boolean => compare(a, b) >= 0;
export const lessThan = (a: Money, b: Money): boolean => compare(a, b) === -1;
export const lessThanOrEqual = (a: Money, b: Money): boolean => compare(a, b) <= 0;

export function isZero(value: Money): boolean {
  return toDecimal(value).isZero();
}

export function isNegative(value: Money): boolean {
  return toDecimal(value).isNegative() && !toDecimal(value).isZero();
}

export function isPositive(value: Money): boolean {
  return toDecimal(value).greaterThan(0);
}

export function maxOf(values: readonly Money[]): Money | null {
  if (values.length === 0) return null;
  return values.reduce((best, v) => (greaterThan(v, best) ? v : best));
}

export function minOf(values: readonly Money[]): Money | null {
  if (values.length === 0) return null;
  return values.reduce((worst, v) => (lessThan(v, worst) ? v : worst));
}

/**
 * Dispersion between the best and worst landed amount, in basis points of the
 * best amount: how much of the achievable total a user forfeits at the bottom
 * of the market. Returns 0 when there is nothing to compare.
 */
export function dispersionBps(values: readonly Money[]): number {
  const best = maxOf(values);
  const worst = minOf(values);
  if (best === null || worst === null || isZero(best)) return 0;
  const fraction = toDecimal(best).minus(toDecimal(worst)).dividedBy(toDecimal(best));
  return fraction.times(10_000).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
}

/**
 * Position of `value` on the [worst, best] axis as a 0..1 ratio, for plotting.
 * This is the one place a monetary value becomes a number, and the result is a
 * geometric coordinate, never a figure shown to a user.
 */
export function positionRatio(value: Money, worst: Money, best: Money): number {
  const span = toDecimal(best).minus(toDecimal(worst));
  if (span.isZero() || span.isNegative()) return 0.5;
  const ratio = toDecimal(value).minus(toDecimal(worst)).dividedBy(span).toNumber();
  return Math.min(1, Math.max(0, ratio));
}

/**
 * A fee breakdown is a single-currency ledger, denominated in what the user
 * receives. The first line is the gross amount at the mid-market reference
 * rate; every following line is a deduction. Expressing the spread as a line
 * item is the whole point — it is the cost providers hide inside the rate.
 *
 * The lines must therefore sum exactly to the landed amount. FeeBreakdown
 * renders an error rather than a wrong breakdown when they do not.
 */
export function reconcileBreakdown(
  lines: readonly { amount: Money; currency: string }[],
  landedAmount: Money,
  tolerance: Money = '0.00000001',
):
  | { ok: true }
  | { ok: false; reason: 'mismatch'; expected: Money; actual: Money; difference: Money }
  | { ok: false; reason: 'mixed_currency'; currencies: string[] }
  | { ok: false; reason: 'empty' } {
  if (lines.length === 0) return { ok: false, reason: 'empty' };

  const currencies = Array.from(new Set(lines.map((l) => l.currency)));
  if (currencies.length > 1) return { ok: false, reason: 'mixed_currency', currencies };

  const expected = sum(lines.map((l) => l.amount));
  const difference = subtract(expected, landedAmount);
  if (lessThanOrEqual(abs(difference), tolerance)) return { ok: true };
  return { ok: false, reason: 'mismatch', expected, actual: landedAmount, difference };
}
