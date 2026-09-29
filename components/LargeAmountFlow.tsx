'use client';

import { useEffect, useState } from 'react';
import { useUrlSearchParams } from '@/lib/hooks/useUrlSearchParams';
import { CORRIDORS, getCorridor } from '@/lib/corridors';
import { formatAmountInput, formatBps, formatMoney, parseAmountInput, symbolFor } from '@/lib/format';
import { greaterThan } from '@/lib/money';
import type { CorridorMeta } from '@/lib/types';
import { HighTicketInterceptor } from './HighTicketInterceptor';
import { AmountField } from './AmountField';
import { Field, Select } from './forms';
import { buttonClass } from './ui/Button';

export function LargeAmountFlow() {
  const [searchParams] = useUrlSearchParams();
  const initial =
    getCorridor(searchParams.get('corridor')) ?? (CORRIDORS[0] as CorridorMeta);
  const initialAmount = parseAmountInput(searchParams.get('amount') ?? '') ?? initial.otcThreshold;

  const [corridorSlug, setCorridorSlug] = useState(initial.slug);
  const [amountInput, setAmountInput] = useState(formatAmountInput(initialAmount));

  // The query string is read just after mount so the page can prerender at
  // its real size. Adopt what arrives, unless the visitor has already typed.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) return;
    setCorridorSlug(initial.slug);
    setAmountInput(formatAmountInput(initialAmount));
  }, [initial.slug, initialAmount, touched]);

  const corridor = getCorridor(corridorSlug) ?? initial;
  const amount = parseAmountInput(amountInput);
  const qualifies = amount !== null && greaterThan(amount, corridor.otcThreshold);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 rounded-card border border-rule bg-surface p-6 sm:grid-cols-2">
        <Field label="Corridor">
          {({ id }) => (
            <Select
              id={id}
              value={corridorSlug}
              onChange={(event) => {
                setTouched(true);
                setCorridorSlug(event.target.value);
              }}
            >
              {CORRIDORS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.from} to {c.to}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Amount"
          hint={`Large-amount pricing starts above ${formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })}.`}
        >
          {({ id, describedBy }) => (
            <AmountField
              id={id}
              value={amountInput}
              aria-describedby={describedBy}
              onValueChange={(next) => {
                setTouched(true);
                setAmountInput(next);
              }}
              className="numeric mt-1 w-full rounded border border-rule bg-paper px-3 py-2 text-base text-ink outline-none focus:border-rule-2"
              placeholder={`${symbolFor(corridor.from)}0`}
            />
          )}
        </Field>
      </div>

      {qualifies && amount !== null ? (
        <HighTicketInterceptor corridor={corridor} amount={amount} />
      ) : (
        <section className="rounded-card border border-rule bg-surface p-8">
          <h2 className="text-3xl text-ink">
            This amount is priced on the public board
          </h2>
          <p className="mt-2 max-w-content text-base text-ink-2">
            Below {formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })} in{' '}
            {corridor.from} to {corridor.to}, retail liquidity is deep enough that the rates on the
            comparison page are the rates you will actually get. Typical dispersion here is{' '}
            {formatBps(corridor.typicalDispersionBps)}, and picking well is worth more than
            negotiating.
          </p>
          <p className="mt-4">
            <a
              href={`/compare/${corridor.slug}?amount=${amount ?? corridor.defaultAmount}`}
              className={buttonClass('primary', 'lg')}
            >
              Compare {corridor.from} to {corridor.to} providers
            </a>
          </p>
        </section>
      )}
    </div>
  );
}
