'use client';

import { useId } from 'react';
import { ASSET_CODES, CORRIDORS, FIAT_CODES, FIAT_NAMES, corridorSlug } from '@/lib/corridors';
import { symbolFor } from '@/lib/format';
import type { AssetCode, CorridorMeta, FiatCode } from '@/lib/types';
import { AmountField } from './AmountField';

export interface CorridorSelectorProps {
  corridor: CorridorMeta;
  amountInput: string;
  onAmountChange: (raw: string) => void;
  onCorridorChange: (slug: string) => void;
  className?: string;
}

const SUPPORTED = new Set(CORRIDORS.map((c) => c.slug));

/**
 * Amount, source currency, destination asset. Everything it changes is written
 * to the URL by the caller, debounced — this component holds no comparison
 * state of its own.
 */
export function CorridorSelector({
  corridor,
  amountInput,
  onAmountChange,
  onCorridorChange,
  className,
}: CorridorSelectorProps) {
  const amountId = useId();
  const fromId = useId();
  const toId = useId();

  const changeFrom = (from: FiatCode) => {
    const preferred = corridorSlug(from, corridor.to);
    onCorridorChange(
      SUPPORTED.has(preferred) ? preferred : corridorSlug(from, ASSET_CODES[0] as AssetCode),
    );
  };

  const changeTo = (to: AssetCode) => onCorridorChange(corridorSlug(corridor.from, to));

  return (
    <div
      className={[
        'grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]',
        className ?? '',
      ].join(' ')}
    >
      <div>
        <label htmlFor={amountId} className="block text-sm font-medium text-ink-2">
          You send
        </label>
        <div className="mt-2 flex items-center rounded-sm border border-rule-2 bg-paper focus-within:border-ink">
          <span aria-hidden="true" className="numeric pl-4 text-xl text-ink-3">
            {symbolFor(corridor.from)}
          </span>
          <AmountField
            id={amountId}
            value={amountInput}
            onValueChange={onAmountChange}
            aria-describedby={`${amountId}-hint`}
            className="numeric w-full bg-transparent px-2 py-3 text-xl text-ink outline-none"
          />
          <span className="pr-4 text-sm text-ink-3">{corridor.from}</span>
        </div>
        <p id={`${amountId}-hint`} className="mt-2 text-xs text-ink-3">
          {FIAT_NAMES[corridor.from]}
        </p>
      </div>

      <div>
        <label htmlFor={fromId} className="block text-sm font-medium text-ink-2">
          From
        </label>
        <select
          id={fromId}
          value={corridor.from}
          onChange={(event) => changeFrom(event.target.value as FiatCode)}
          className="mt-2 w-full rounded-sm border border-rule-2 bg-paper px-4 py-3 text-base text-ink outline-none focus:border-ink"
        >
          {FIAT_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink-3">Currency you hold</p>
      </div>

      <div>
        <label htmlFor={toId} className="block text-sm font-medium text-ink-2">
          To
        </label>
        <select
          id={toId}
          value={corridor.to}
          onChange={(event) => changeTo(event.target.value as AssetCode)}
          className="mt-2 w-full rounded-sm border border-rule-2 bg-paper px-4 py-3 text-base text-ink outline-none focus:border-ink"
        >
          {ASSET_CODES.filter((code) => SUPPORTED.has(corridorSlug(corridor.from, code))).map(
            (code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ),
          )}
        </select>
        <p className="mt-2 text-xs text-ink-3">Stablecoin you want</p>
      </div>
    </div>
  );
}
