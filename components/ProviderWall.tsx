import { listProviders } from '@/lib/quotes/server';
import { CORRIDORS } from '@/lib/corridors';
import { Section, SectionHeading, type SectionTone } from './ui/Section';
import { paymentMethodsFor } from '@/lib/corridorNotes';

/**
 * The coverage grid: everything we compare, and every way you can pay for it.
 * Doubles as disclosure — an aggregator is marked as one and so is a provider
 * we earn from, before you have scrolled anywhere.
 */
export async function ProviderWall({ tone = 'paper' }: { tone?: SectionTone }) {
  const providers = await listProviders();
  const methods = Array.from(new Set(CORRIDORS.flatMap((c) => paymentMethodsFor(c.slug))));

  return (
    <Section tone={tone} labelledBy="providers-heading">
      <SectionHeading
        id="providers-heading"
        title="Every provider, every request"
        standfirst="We ask all of them, every time, and report the ones that do not answer as well as the ones that do."
      />

      <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <h3 className="text-sm font-medium text-ink-3">
            {providers.length} providers compared
          </h3>
          <ul className="mt-6 flex flex-wrap gap-3">
            {providers.map((provider) => (
              <li
                key={provider.slug}
                className="flex items-center gap-2 rounded-pill border border-rule bg-surface px-5 py-3"
              >
                <span className="font-medium text-ink">{provider.name}</span>
                {provider.source === 'aggregator' && (
                  <span
                    className="text-xs text-ink-3"
                    title="Reached through an aggregator, not directly."
                  >
                    aggregator
                  </span>
                )}
                {provider.integrated ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-brand"
                    title="Live pricing integration: figures come from this provider's public market data."
                    aria-label="Live pricing integration"
                    role="img"
                  />
                ) : (
                  <span className="text-xs text-ink-3" title="No live pricing integration yet.">
                    no live pricing yet
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-3">
            A dot marks a live pricing integration. The rest are tracked and appear in results
            as exactly what they are: not priced yet. Netfall currently earns nothing from any
            of them.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-ink-3">{methods.length} ways to pay</h3>
          <ul className="mt-6 flex flex-wrap gap-3">
            {methods.map((method) => (
              <li
                key={method}
                className="rounded-pill border border-rule bg-surface px-5 py-3 font-medium text-ink"
              >
                {method}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-3">
            Method availability differs by corridor, and the cheapest provider often is not the
            one that takes your preferred rail.
          </p>
        </div>
      </div>
    </Section>
  );
}
