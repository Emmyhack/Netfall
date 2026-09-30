import type { CorridorMeta, UnavailableQuote, UnavailableReason } from '@/lib/types';

/**
 * Rule §4.3: providers that could not quote are never hidden. Absence is
 * information — a provider that times out on every request is telling you
 * something, and a floor you fall below is a reason to change the amount.
 *
 * The reasons stay at the level the API actually reports. We do not invent a
 * specific limit figure the provider never sent us.
 */
const REASONS: Readonly<Record<UnavailableReason, (corridor: CorridorMeta) => string>> = {
  below_minimum: () => 'Your amount is below this provider’s minimum. Try a larger amount.',
  above_maximum: () => 'Your amount is above this provider’s maximum for this corridor.',
  timeout: () => 'Did not respond in time. Their pricing may be moving.',
  corridor_unsupported: (corridor) => `Does not serve ${corridor.from} to ${corridor.to}.`,
  provider_down: () => 'Their pricing service is not responding.',
  insufficient_data: () =>
    'Returned a price we could not make sense of, so we are not showing a figure.',
  not_configured: () =>
    'We track this provider but have no live pricing integration with them yet, so there is no figure to show.',
};

export function UnavailableList({
  entries,
  corridor,
  className,
}: {
  entries: readonly UnavailableQuote[];
  corridor: CorridorMeta;
  className?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section className={['overflow-hidden rounded-card border border-rule bg-surface-2', className ?? ''].join(' ')}>
      <h3 className="border-b border-rule px-5 py-4 text-base font-medium text-ink-2">
        {entries.length} {entries.length === 1 ? 'provider' : 'providers'} could not quote
      </h3>
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.provider}
            className="flex flex-col gap-px border-b border-rule px-5 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <span className="text-sm font-medium text-absent sm:w-40 sm:shrink-0">{entry.providerName}</span>
            <span className="text-sm text-ink-3">{REASONS[entry.reason](corridor)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
