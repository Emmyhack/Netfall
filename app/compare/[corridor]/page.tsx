import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ComparisonWidget } from '@/components/ComparisonWidget';
import { DisclosureNotice } from '@/components/DisclosureNotice';
import { Faq, FAQ_QUESTIONS } from '@/components/Faq';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/JsonLd';
import { ButtonLink, Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { CORRIDORS, getCorridor } from '@/lib/corridors';
import { corridorNote } from '@/lib/corridorNotes';
import { corridorInsight, corridorSummary } from '@/lib/corridorInsight';
import { formatBps, formatMoney, formatPaymentMethods } from '@/lib/format';

/** One statically generated page per corridor. These are the search asset. */
export function generateStaticParams() {
  return CORRIDORS.map((corridor) => ({ corridor: corridor.slug }));
}

/**
 * The corridor set is closed and fully enumerated by generateStaticParams, so
 * anything outside it is a 404 that Next answers without rendering the page.
 *
 * With dynamicParams enabled, a notFound() here was being cached and
 * persisted as a prerendered page — /compare/aaa-bbb was written to disk and
 * served with a 200. Every invented corridor URL would have become an
 * indexable soft 404.
 */
export const dynamicParams = false;

type Params = { params: Promise<{ corridor: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { corridor: slug } = await params;
  const corridor = getCorridor(slug);

  if (!corridor) {
    return { title: 'Corridor not tracked', robots: { index: false, follow: true } };
  }

  const insight = await corridorInsight(corridor);
  const title = `${corridor.from} to ${corridor.to} rates compared`;
  const description = corridorSummary(corridor, insight);

  return {
    title,
    description,
    alternates: { canonical: `/compare/${corridor.slug}` },
    openGraph: { title: `${title} · Netfall`, description, url: `/compare/${corridor.slug}` },
  };
}

export default async function CorridorPage({ params }: Params) {
  const { corridor: slug } = await params;
  const corridor = getCorridor(slug);

  // Unreachable while dynamicParams is false; kept so the type narrows and
  // so re-enabling dynamic params cannot silently render a broken page.
  if (!corridor) notFound();

  const insight = await corridorInsight(corridor);
  const others = CORRIDORS.filter((c) => c.slug !== corridor.slug);

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: 'Netfall', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: `${corridor.from} to ${corridor.to}`, path: `/compare/${corridor.slug}` },
        ]}
      />
      <FaqJsonLd questions={FAQ_QUESTIONS} />

      <ComparisonWidget
        corridorFromPath={corridor}
        mode="path"
        heroSlot={
          <div className="lg:pt-4">
            <Pill className="mb-6">
              {corridor.providers.length} providers · typical spread{' '}
              {formatBps(corridor.typicalDispersionBps)}
            </Pill>

            <h1 className="text-display text-ink">
              {corridor.from} to {corridor.to}: what actually lands
            </h1>
            <p className="mt-6 max-w-content text-lg text-ink-2">
              {corridor.providers.length} providers convert {corridor.fromName} into{' '}
              {corridor.toName}, and they advertise their prices in ways you cannot compare.
              Below is what each one would actually deliver on your amount.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/alerts?corridor=${corridor.slug}`} variant="primary" size="lg">
                Set a rate alert
              </ButtonLink>
              <ButtonLink href="/large-amounts" variant="secondary" size="lg">
                Sending a large amount?
              </ButtonLink>
            </div>
          </div>
        }
      />

      <Section tone="paper" labelledBy="corridor-notes">
        <h2 id="corridor-notes" className="text-3xl text-ink">
          How this corridor behaves
        </h2>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <p className="max-w-content text-lg text-ink-2">{corridorNote(corridor.slug)}</p>
            <p className="max-w-content text-lg text-ink-2">
              On a typical {formatMoney(insight.sampleAmount, corridor.from, { decimals: 0 })}{' '}
              transfer, the gap between best and worst was{' '}
              {formatBps(insight.measuredDispersionBps)}
              {insight.bestLanded && insight.worstLanded
                ? ` — ${formatMoney(insight.bestLanded, corridor.to)} against ${formatMoney(insight.worstLanded, corridor.to)}`
                : ''}
              .{' '}
              {insight.unavailableCount > 0
                ? `${insight.unavailableCount} of the ${corridor.providers.length} providers could not quote at all when we last measured, which is normal here.`
                : 'Every provider quoted when we last measured, which is unusual.'}
            </p>
            {insight.fastestSettlement && (
              <p className="max-w-content text-lg text-ink-2">
                The fastest settlement we saw was {insight.fastestSettlement}. Speed and price pull
                in opposite directions here: the cheapest route is rarely the quickest.
              </p>
            )}
          </div>

          <dl className="space-y-6">
            {[
              ['Payment methods people use here', formatPaymentMethods(corridor.commonPaymentMethods)],
              ['Providers we track', formatPaymentMethods(insight.providerNames)],
              ...(insight.aggregatorNames.length > 0
                ? ([
                    [
                      'Reached through an aggregator',
                      `${formatPaymentMethods(insight.aggregatorNames)}. Their price is set by the aggregator, not the provider holding the liquidity.`,
                    ],
                  ] as [string, string][])
                : []),
              [
                'Amounts we compare publicly',
                `${formatMoney(corridor.minAmount, corridor.from, { decimals: 0 })} to ${formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })}`,
              ],
            ].map(([term, detail]) => (
              <div key={term} className="border-t border-rule pt-4">
                <dt className="text-sm text-ink-3">{term}</dt>
                <dd className="mt-2 text-lg text-ink-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DisclosureNotice variant="block" className="mt-12" />
      </Section>

      <Section tone="white" labelledBy="alerts-cta">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="alerts-cta" className="text-3xl text-ink">
              Watch this corridor
            </h2>
            <p className="mt-5 max-w-content text-lg text-ink-2">
              Rates move through the day and the cheapest provider changes with them. Set an alert
              and we will tell you when {corridor.from} to {corridor.to} hits the rate you want.
            </p>
          </div>
          <ButtonLink href={`/alerts?corridor=${corridor.slug}`} variant="primary" size="lg">
            Set a rate alert
          </ButtonLink>
        </div>
      </Section>

      <Section tone="paper" labelledBy="related-corridors">
        <h2 id="related-corridors" className="text-3xl text-ink">
          Other corridors
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={`/compare/${other.slug}`}
                className="flex h-full flex-col justify-between rounded-card border border-rule bg-surface p-6 transition-colors hover:border-rule-2"
              >
                <span className="text-2xl text-ink">
                  {other.from} to {other.to}
                </span>
                <span className="mt-8 border-t border-rule pt-4 text-sm text-ink-2">
                  {other.providers.length} providers · ~{formatBps(other.typicalDispersionBps)}{' '}
                  spread
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Faq />
    </>
  );
}
