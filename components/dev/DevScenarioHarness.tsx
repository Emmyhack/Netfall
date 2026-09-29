'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ComparisonWidget } from '@/components/ComparisonWidget';
import { CORRIDORS, getCorridor } from '@/lib/corridors';
import { multiply } from '@/lib/money';
import { SCENARIO_IDS, SCENARIO_LABELS } from '@/lib/mock/fixtures';
import type { CorridorMeta } from '@/lib/types';

/**
 * Every state in §9 is reachable from here, by URL, without hunting for a
 * seed. The controls write the same query params the app already reads, so
 * any link from this page is a shareable reproduction.
 */
export function DevScenarioHarness() {
  const searchParams = useSearchParams();
  const active = searchParams.get('scenario') ?? 'default';
  const corridor =
    getCorridor(`${searchParams.get('from')}-${searchParams.get('to')}`) ??
    (CORRIDORS[0] as CorridorMeta);
  const seed = searchParams.get('seed') ?? 'dev';
  const amount = searchParams.get('amount') ?? corridor.defaultAmount;

  const link = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({
      from: corridor.from.toLowerCase(),
      to: corridor.to.toLowerCase(),
      amount,
      seed,
      scenario: active,
      ...overrides,
    });
    return `/_dev/scenarios?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-display text-ink">Scenario harness</h1>
      <p className="mt-5 max-w-content text-lg text-ink-2">
        The mock layer is deliberately adversarial. Pick a scenario and the whole comparison
        surface renders against it, including every degraded state.
      </p>

      <section className="mt-8 space-y-4 rounded-card border border-rule bg-surface p-6">
        <Control label="Scenario">
          {SCENARIO_IDS.map((id) => (
            <Chip key={id} href={link({ scenario: id })} active={id === active}>
              {id}
            </Chip>
          ))}
        </Control>

        <Control label="Corridor">
          {CORRIDORS.map((c) => (
            <Chip
              key={c.slug}
              href={link({ from: c.from.toLowerCase(), to: c.to.toLowerCase(), amount: c.defaultAmount })}
              active={c.slug === corridor.slug}
            >
              {c.from}-{c.to}
            </Chip>
          ))}
        </Control>

        <Control label="Amount">
          {[
            { label: 'minimum', value: corridor.minAmount },
            { label: 'typical', value: corridor.defaultAmount },
            { label: 'ten times typical', value: multiply(corridor.defaultAmount, '10') },
            { label: 'over the OTC threshold', value: multiply(corridor.otcThreshold, '2') },
          ].map((option) => (
            <Chip key={option.label} href={link({ amount: option.value })} active={amount === option.value}>
              {option.label}
            </Chip>
          ))}
        </Control>

        <Control label="Seed">
          {['dev', 'alpha', 'beta', 'gamma', 'delta'].map((s) => (
            <Chip key={s} href={link({ seed: s })} active={s === seed}>
              {s}
            </Chip>
          ))}
        </Control>

        <p className="text-sm text-ink-2">{SCENARIO_LABELS[active as keyof typeof SCENARIO_LABELS]}</p>
      </section>

      <div className="mt-8">
        <ComparisonWidget key={`${active}:${seed}:${corridor.slug}`} mode="query" />
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="w-24 shrink-0 text-xs text-ink-3">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={[
        'rounded-pill border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:bg-surface-2',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
