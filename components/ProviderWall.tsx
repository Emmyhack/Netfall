import { listProviders } from '@/lib/quotes/source';
import { CORRIDORS } from '@/lib/corridors';
import { Section, SectionHeading, type SectionTone } from './ui/Section';

/**
 * The coverage grid: everything we compare, and every way you can pay for it.
 * Doubles as disclosure — an aggregator is marked as one and so is a provider
 * we earn from, before you have scrolled anywhere.
 */
export async function ProviderWall({ tone = 'paper' }: { tone?: SectionTone }) {
  const providers = await listProviders();
  const methods = Array.from(new Set(CORRIDORS.flatMap((c) => c.commonPaymentMethods)));

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
                {provider.hasCommercialRelationship && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-brand"
                    title="Netfall earns a commission from this provider. It does not affect ranking."
                    aria-label="We earn a commission from this provider"
                    role="img"
                  />
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-3">
            A dot marks a provider we earn a commission from. It has no effect on where they
            rank.
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
