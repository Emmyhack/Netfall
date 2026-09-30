import Link from 'next/link';
import type { Metadata } from 'next';
import { CorridorListJsonLd } from '@/components/JsonLd';
import { Faq } from '@/components/Faq';
import { ClosingCta } from '@/components/ClosingCta';
import { Pill } from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import { corridorInsight } from '@/lib/corridorInsight';
import { computeCoverage } from '@/lib/coverage';
import { formatBps, formatMoney, formatPaymentMethods } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Compare every corridor',
  description:
    'Every stablecoin corridor Netfall tracks, with the provider count and typical spread for each. NGN, GHS and KES into USDT and USDC.',
  alternates: { canonical: '/compare' },
};

/**
 * The index the corridor pages hang off. Without it /compare was a 404 that
 * search engines would find from the sitemap and from trimmed URLs.
 */
export default async function CompareIndexPage() {
  const coverage = await computeCoverage();
  const corridorCards = await Promise.all(
    CORRIDORS.map(async (corridor) => ({ corridor, insight: await corridorInsight(corridor) })),
  );

  return (
    <>
      <CorridorListJsonLd />

      <Section tone="paper" size="lg">
        <Pill className="mb-8">
          {coverage.providerCount} providers · {coverage.corridorCount} corridors
        </Pill>
        <h1 className="text-display text-ink">Compare every corridor</h1>
        <p className="mt-8 max-w-content text-lead text-ink-3">
          Pick a corridor and see what each provider would actually deliver on your amount. The
          ranking is the landed amount, descending, and nothing else moves it.
        </p>
      </Section>

      <Section tone="white" labelledBy="all-corridors">
        <SectionHeading
          id="all-corridors"
          title="Every corridor we track"
          standfirst="Each has its own provider set, its own payment rails and its own dispersion."
        />

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {corridorCards.map(({ corridor, insight }) => {
            return (
              <li key={corridor.slug}>
                <Link
                  href={`/compare/${corridor.slug}`}
                  className="flex h-full flex-col justify-between rounded-card border border-rule bg-paper p-8 transition-colors hover:border-rule-2"
                >
                  <div>
                    <span className="block text-3xl text-ink">
                      {corridor.from} to {corridor.to}
                    </span>
                    <span className="mt-4 block text-ink-2">
                      {corridor.fromName} into {corridor.toName}
                    </span>
                    <span className="mt-6 block text-sm text-ink-3">
                      {formatPaymentMethods(corridor.commonPaymentMethods)}
                    </span>
                  </div>

                  <dl className="mt-10 space-y-2 border-t border-rule pt-5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-3">Providers</dt>
                      <dd className="numeric text-ink-2">{corridor.providers.length}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-3">Measured spread</dt>
                      <dd className="numeric text-ink-2">
                        {formatBps(insight.measuredDispersionBps)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-3">Public up to</dt>
                      <dd className="numeric text-ink-2">
                        {formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Faq tone="paper" />

      <ClosingCta
        title="See what actually lands."
        standfirst="One figure, every provider, ranked honestly."
        primary={{ href: `/compare/${CORRIDORS[0]?.slug}`, label: 'Start comparing' }}
        secondary={{ href: '/api', label: 'Read the API' }}
      />
    </>
  );
}
