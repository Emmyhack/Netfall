import Link from 'next/link';
import { ClosingCta } from '@/components/ClosingCta';
import { FaqJsonLd, OrganizationJsonLd, WebSiteJsonLd } from '@/components/JsonLd';
import { ComparisonWidget } from '@/components/ComparisonWidget';
import { CoverageStats } from '@/components/CoverageStats';
import { DeveloperSection } from '@/components/DeveloperSection';
import { Faq, FAQ_QUESTIONS } from '@/components/Faq';
import { HowItWorks } from '@/components/HowItWorks';
import { ProviderWall } from '@/components/ProviderWall';
import { ButtonLink, Pill } from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import { computeCoverage } from '@/lib/coverage';
import { providersFor } from '@/lib/live/registry-core';
import { formatBps } from '@/lib/format';

const PROMISES = [
  [
    'Ranked by landed amount alone',
    'No sponsored placement and no paid boost. The order is one sort on one field.',
  ],
  [
    'Any future relationship gets labelled in the table',
    'Next to the provider, at the point of comparison, before anything else changes.',
  ],
  [
    'Providers that failed are still shown',
    'Including the ones we earn from. A partner that times out appears as one.',
  ],
  [
    'No figure adjusted to flatter anyone',
    'A breakdown that does not reconcile shows an error, not a rounded number.',
  ],
];

/** Live figures refresh on this cadence rather than freezing at build. */
export const revalidate = 300;

export default async function HomePage() {
  const coverage = await computeCoverage();

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <FaqJsonLd questions={FAQ_QUESTIONS} />

      {/*
        Sections alternate page-lavender and white the whole way down, and the
        brand blue appears once at the bottom. That is onramper.com's colour
        pattern; the structure follows the same order their page does.
      */}
      <ComparisonWidget
        mode="query"
        heroSlot={
          <div className="lg:pt-6">
            <Pill className="mb-8">
              {coverage.providerCount} providers · {coverage.corridorCount} corridors
            </Pill>

            <h1 className="text-display text-ink">See what actually lands</h1>

            <p className="mt-8 max-w-content text-lead text-ink-3">
              Providers advertise numbers you cannot compare. Netfall resolves all of it to one
              figure — how much arrives — and ranks providers by that and nothing else.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/compare/ngn-usdt" variant="primary" size="lg">
                Compare every corridor
              </ButtonLink>
              <ButtonLink href="/api" variant="secondary" size="lg">
                Read the API
              </ButtonLink>
            </div>
          </div>
        }
      />

      <ProviderWall tone="paper" />
      <HowItWorks tone="white" />
      <CoverageStats tone="paper" />

      {/* The trust slot. Rule §4.5 gets a section, not a footnote. */}
      <Section tone="white" labelledBy="money-heading">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <SectionHeading
              id="money-heading"
              title="Nobody pays us. Nothing moves the ranking."
              standfirst="Netfall currently earns no commission from any provider listed. When that changes, the affected providers get labelled in the table before anything else does."
              size="lg"
            />
            <ButtonLink href="/how-we-make-money" variant="primary" size="lg" className="mt-12">
              The full explanation
            </ButtonLink>
          </div>

          <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {PROMISES.map(([title, detail]) => (
              <li key={title} className="border-t border-rule-2 pt-6">
                <p className="text-xl text-ink">{title}</p>
                <p className="mt-3 text-ink-2">{detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <DeveloperSection tone="paper" />

      <Section tone="white" labelledBy="corridors-heading">
        <SectionHeading
          id="corridors-heading"
          title="Every corridor we track"
          standfirst="Each one has its own page, its own provider set and its own dispersion."
        />

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CORRIDORS.map((corridor) => (
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
                </div>
                <div className="mt-12 flex items-baseline justify-between border-t border-rule pt-5">
                  <span className="text-sm text-ink-3">{providersFor(corridor.slug).length} providers</span>
                  <span className="text-sm text-ink-3">
                    {providersFor(corridor.slug).some((p) => p.integrated)
                      ? 'live pricing'
                      : 'tracked'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Faq tone="paper" />

      <ClosingCta
        title="See what actually lands."
        standfirst="One figure, every provider, ranked honestly."
        primary={{ href: '/compare/ngn-usdt', label: 'Compare rates' }}
        secondary={{ href: '/api', label: 'Read the API' }}
      />
    </>
  );
}
