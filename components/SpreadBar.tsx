'use client';

import { useMemo } from 'react';
import { useElementWidth } from '@/lib/hooks/useElementWidth';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { formatBps, formatMoney } from '@/lib/format';
import {
  divide,
  dispersionBps as computeDispersionBps,
  isZero,
  maxOf,
  minOf,
  positionRatio,
  subtract,
  type Money,
} from '@/lib/money';
import type { Confidence } from '@/lib/types';

export interface SpreadBarQuote {
  provider: string;
  providerName: string;
  landedAmount: Money;
  confidence: Confidence;
}

export interface SpreadBarProps {
  quotes: readonly SpreadBarQuote[];
  /** The asset the landed amounts are denominated in, e.g. "USDT". */
  assetCurrency: string;
  /** The currency the user is sending. The cost of choosing badly is shown in it. */
  fiatCurrency?: string;
  /** Landed ÷ input for the best quote. Converts the gap back into fiat. */
  bestEffectiveRate?: Money;
  variant?: 'full' | 'compact';
  /** Set false once the figures have already been on screen. */
  animate?: boolean;
  className?: string;
}

/** Below this measured width the bar drops its ticks for a two-endpoint form. */
const NARROW_BREAKPOINT = 420;

const FULL = {
  height: 196,
  axisY: 104,
  tickHeight: 30,
  bestTickHeight: 46,
  padX: 2,
  bracketY: 158,
  capHeight: 14,
  endLabel: 13,
  endValue: 26,
  gapLabel: 17,
  axisWidth: 1.5,
  tickWidth: 2,
  bestTickWidth: 4,
};

const COMPACT = {
  height: 62,
  axisY: 40,
  tickHeight: 10,
  bestTickHeight: 16,
  padX: 2,
  bracketY: 0,
  capHeight: 7,
  endLabel: 12,
  endValue: 13,
  gapLabel: 14,
  axisWidth: 1,
  tickWidth: 1.5,
  bestTickWidth: 2.5,
};

export function SpreadBar({
  quotes,
  assetCurrency,
  fiatCurrency,
  bestEffectiveRate,
  variant = 'full',
  animate = true,
  className,
}: SpreadBarProps) {
  const [ref, width, measured] = useElementWidth<HTMLDivElement>(720);
  const reducedMotion = useReducedMotion();
  const geometry = variant === 'compact' ? COMPACT : FULL;
  const narrow = measured && width < NARROW_BREAKPOINT;

  const model = useMemo(() => buildModel(quotes), [quotes]);

  if (!model) {
    // Holds the bar's full height so the page does not jump when it resolves.
    return (
      <div ref={ref} className={className}>
        <div
          className="flex items-center"
          style={{ height: geometry.height + (variant === 'full' ? 30 : 26) }}
        >
          <p className="text-sm text-ink-3">No quotes to plot yet.</p>
        </div>
      </div>
    );
  }

  const { best, worst, gap, bestQuote, worstQuote, ticks, flat, single } = model;

  const innerWidth = Math.max(80, width - geometry.padX * 2);
  const x = (ratio: number) => geometry.padX + ratio * innerWidth;
  const centreX = geometry.padX + innerWidth / 2;
  const shouldAnimate = animate && !reducedMotion;

  const gapInFiat =
    fiatCurrency && bestEffectiveRate && !isZero(bestEffectiveRate)
      ? divide(gap, bestEffectiveRate, 2)
      : null;

  const lossLabel = buildLossLabel({ flat, single, gap, gapInFiat, fiatCurrency, assetCurrency });

  return (
    <div ref={ref} className={className}>
      <figure className="m-0">
        <figcaption className="sr-only">{describeForScreenReaders(model, assetCurrency)}</figcaption>

        <svg
          width={width}
          height={geometry.height}
          viewBox={`0 0 ${width} ${geometry.height}`}
          role="presentation"
          aria-hidden="true"
          className="block overflow-visible"
        >
          {/* End labels, above the axis */}
          <text
            x={geometry.padX}
            y={geometry.axisY - geometry.endValue - 16}
            className={`fill-[var(--ink-3)] ${shouldAnimate ? 'spread-label' : ''}`}
            style={{ fontSize: geometry.endLabel }}
          >
            worst
          </text>
          <text
            x={geometry.padX + innerWidth}
            y={geometry.axisY - geometry.endValue - 16}
            textAnchor="end"
            className={`fill-[var(--best)] ${shouldAnimate ? 'spread-label' : ''}`}
            style={{ fontSize: geometry.endLabel }}
          >
            best
          </text>

          {/* End values */}
          <text
            x={geometry.padX}
            y={geometry.axisY - 14}
            className={`numeric fill-[var(--ink-2)] ${shouldAnimate ? 'spread-label' : ''}`}
            style={{ fontSize: geometry.endValue }}
          >
            {formatMoney(worst, assetCurrency, { showCode: false })}
          </text>
          <text
            x={geometry.padX + innerWidth}
            y={geometry.axisY - 14}
            textAnchor="end"
            className={`numeric fill-[var(--best)] ${shouldAnimate ? 'spread-label' : ''}`}
            style={{ fontSize: geometry.endValue, fontWeight: 600 }}
          >
            {formatMoney(best, assetCurrency)}
          </text>

          {/* The axis itself, drawn from the centre outward */}
          <g
            className={shouldAnimate ? 'spread-axis' : undefined}
            style={shouldAnimate ? { transformOrigin: `${centreX}px ${geometry.axisY}px` } : undefined}
          >
            <line
              x1={geometry.padX}
              x2={geometry.padX + innerWidth}
              y1={geometry.axisY}
              y2={geometry.axisY}
              stroke="var(--rule-2)"
              strokeWidth={geometry.axisWidth}
            />
            {/* End caps: the range has hard edges, not a fade. */}
            <line
              x1={geometry.padX}
              x2={geometry.padX}
              y1={geometry.axisY - geometry.capHeight}
              y2={geometry.axisY + geometry.capHeight}
              stroke="var(--rule-2)"
              strokeWidth={geometry.axisWidth}
            />
            <line
              x1={geometry.padX + innerWidth}
              x2={geometry.padX + innerWidth}
              y1={geometry.axisY - geometry.capHeight}
              y2={geometry.axisY + geometry.capHeight}
              stroke="var(--best)"
              strokeWidth={geometry.bestTickWidth}
            />
          </g>

          {/* Provider ticks. Dropped on narrow viewports rather than crushed. */}
          {!narrow &&
            !single &&
            ticks.map((tick, index) => {
              const cx = x(tick.ratio);
              const isBest = tick.provider === bestQuote.provider;
              const height = isBest ? geometry.bestTickHeight : geometry.tickHeight;
              return (
                <g
                  key={tick.provider}
                  className={shouldAnimate ? 'spread-tick' : undefined}
                  style={
                    shouldAnimate
                      ? ({
                          '--tick-offset': `${centreX - cx}px`,
                          '--tick-delay': `${120 + index * 26}ms`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <line
                    x1={cx}
                    x2={cx}
                    y1={geometry.axisY - height / 2}
                    y2={geometry.axisY + height / 2}
                    stroke={isBest ? 'var(--best)' : 'var(--ink-3)'}
                    strokeWidth={isBest ? geometry.bestTickWidth : geometry.tickWidth}
                    strokeLinecap="butt"
                  />
                  {tick.confidence !== 'exact' && (
                    <circle
                      cx={cx}
                      cy={geometry.axisY + height / 2 + (variant === 'full' ? 9 : 5)}
                      r={variant === 'full' ? 3 : 1.75}
                      fill="var(--caution)"
                    />
                  )}
                </g>
              );
            })}

          {/* The gap, bracketed and labelled. The bar's whole argument. */}
          {variant === 'full' && !flat && !single && (
            <g className={shouldAnimate ? 'spread-label' : undefined}>
              {bracketSegments(
                geometry.padX,
                geometry.padX + innerWidth,
                geometry.bracketY,
                centreX,
                estimateTextWidth(lossLabel.headline, geometry.gapLabel) / 2 + 16,
              ).map((d, index) => (
                <path key={index} d={d} fill="none" stroke="var(--rule-2)" strokeWidth={1} />
              ))}
              <text
                x={centreX}
                y={geometry.bracketY}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[var(--ink)]"
                style={{ fontSize: geometry.gapLabel, fontWeight: 600 }}
              >
                {lossLabel.headline}
              </text>
            </g>
          )}
        </svg>

        <p
          className={[
            'flex flex-wrap items-baseline gap-x-2 gap-y-1',
            variant === 'full' ? 'mt-1' : 'mt-2',
            shouldAnimate ? 'spread-label' : '',
          ].join(' ')}
        >
          {(variant === 'compact' || flat || single) && (
            <span className={flat || single ? 'text-sm text-ink-2' : 'text-base font-semibold text-ink'}>
              {lossLabel.headline}
            </span>
          )}
          {lossLabel.detail && <span className="text-sm text-ink-3">{lossLabel.detail}</span>}
        </p>
      </figure>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface Tick {
  provider: string;
  providerName: string;
  ratio: number;
  confidence: Confidence;
}

interface SpreadModel {
  best: Money;
  worst: Money;
  gap: Money;
  dispersionBps: number;
  bestQuote: SpreadBarQuote;
  worstQuote: SpreadBarQuote;
  ticks: Tick[];
  /** Every provider landed the same amount. */
  flat: boolean;
  /** Only one provider quoted, so there is no range. */
  single: boolean;
}

function buildModel(quotes: readonly SpreadBarQuote[]): SpreadModel | null {
  if (quotes.length === 0) return null;

  const amounts = quotes.map((q) => q.landedAmount);
  const best = maxOf(amounts);
  const worst = minOf(amounts);
  if (best === null || worst === null) return null;

  const bestQuote = quotes.find((q) => q.landedAmount === best) ?? (quotes[0] as SpreadBarQuote);
  const worstQuote = quotes.find((q) => q.landedAmount === worst) ?? (quotes[0] as SpreadBarQuote);
  const gap = subtract(best, worst);

  return {
    best,
    worst,
    gap,
    dispersionBps: computeDispersionBps(amounts),
    bestQuote,
    worstQuote,
    ticks: quotes.map((q) => ({
      provider: q.provider,
      providerName: q.providerName,
      ratio: positionRatio(q.landedAmount, worst, best),
      confidence: q.confidence,
    })),
    flat: isZero(gap),
    single: quotes.length === 1,
  };
}

/**
 * Two segments with a gap in the middle for the label, so the bracket reads as
 * one measurement rather than a rule with text floating over it.
 */
function bracketSegments(
  left: number,
  right: number,
  y: number,
  centre: number,
  halfGap: number,
): string[] {
  const rise = 6;
  const innerLeft = Math.max(left, centre - halfGap);
  const innerRight = Math.min(right, centre + halfGap);
  return [
    `M ${left} ${y - rise} L ${left} ${y} L ${innerLeft} ${y}`,
    `M ${innerRight} ${y} L ${right} ${y} L ${right} ${y - rise}`,
  ];
}

/**
 * Rough advance width for the UI face. Only used to leave a gap in a rule, so
 * a few pixels either way is invisible; measuring the text would cost a paint.
 */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

function buildLossLabel(input: {
  flat: boolean;
  single: boolean;
  gap: Money;
  gapInFiat: Money | null;
  fiatCurrency: string | undefined;
  assetCurrency: string;
}): { headline: string; detail: string | null } {
  const { flat, single, gap, gapInFiat, fiatCurrency, assetCurrency } = input;

  if (single) {
    return {
      headline: 'Only one provider is quoting this amount',
      detail: 'There is nothing to compare against right now.',
    };
  }

  if (flat) {
    return {
      headline: 'Every provider lands the same amount',
      detail: 'Choose on settlement time and reliability instead.',
    };
  }

  const assetGap = formatMoney(gap, assetCurrency);

  if (gapInFiat && fiatCurrency) {
    return {
      headline: `You could lose ${formatMoney(gapInFiat, fiatCurrency, { decimals: 0 })}`,
      detail: `${assetGap} less than the best available, if you pick the worst of these.`,
    };
  }

  return {
    headline: `You could lose ${assetGap}`,
    detail: 'if you pick the worst of these instead of the best.',
  };
}

function describeForScreenReaders(model: SpreadModel, assetCurrency: string): string {
  if (model.single) {
    return `One provider quoting: ${model.bestQuote.providerName} at ${formatMoney(model.best, assetCurrency)}.`;
  }
  if (model.flat) {
    return `All ${model.ticks.length} providers land ${formatMoney(model.best, assetCurrency)}.`;
  }
  return (
    `Landed amounts across ${model.ticks.length} providers range from ` +
    `${formatMoney(model.worst, assetCurrency)} with ${model.worstQuote.providerName} to ` +
    `${formatMoney(model.best, assetCurrency)} with ${model.bestQuote.providerName}, ` +
    `a spread of ${formatBps(model.dispersionBps)}.`
  );
}
