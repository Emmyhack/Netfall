import Link from 'next/link';
import type { Metadata } from 'next';
import { HowItWorks } from '@/components/HowItWorks';
import { Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { computeCoverage } from '@/lib/coverage';
import { formatBps } from '@/lib/format';
import { CORRIDORS } from '@/lib/corridors';

/** Live figures refresh on this cadence rather than freezing at build. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'What Netfall measures',
  description:
    'Netfall resolves non-comparable provider pricing into one figure: how much actually lands. Here is what we measure, how, and what we deliberately do not do.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const coverage = await computeCoverage();

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">A measuring instrument</Pill>
          <h1 className="text-display max-w-[54rem] text-ink">What Netfall measures</h1>
          <div className="mt-8 max-w-content space-y-5 text-lg text-ink-2">
            <p>
              Providers converting naira, cedis or shillings into dollar stablecoins advertise
              numbers that cannot be compared with each other. One quotes a good rate and charges
              a fee. One charges no fee and takes a wider spread. One publishes a headline price
              that only applies above a threshold most people never reach. All three are telling
              the truth, and none of them is answering the question you actually have.
            </p>
            <p className="text-ink">
              The question is: if I send this much, how much arrives? Netfall answers that, for
              every provider in a corridor, and ranks them by the answer.
            </p>
          </div>
        </div>
      </section>

      <HowItWorks />

      <Section tone="white" labelledBy="confidence">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 id="confidence" className="text-3xl">
              When we are not sure
            </h2>
            <p className="mt-5 max-w-content text-lg text-ink-2">
              Not every quote is equally solid. A provider may be slow, may publish pricing rather
              than quote it live, or may not respond at all. Rather than smoothing that over,
              every figure carries its confidence, and an estimate is marked as one wherever it
              appears.
            </p>
          </div>

          <dl className="space-y-6">
            {[
              ['Exact', 'A live quote for your amount.'],
              [
                'Estimated',
                'From the provider’s public price feed or order book, not a firm quote for your amount. Depth and fees can change what arrives.',
              ],
              [
                'Not verified',
                'We could not confirm their current pricing at all. Shown, ranked on the figure we have, and marked so you check it yourself.',
              ],
            ].map(([term, detail]) => (
              <div key={term} className="border-t border-rule pt-5">
                <dt className="text-xl">{term}</dt>
                <dd className="mt-2 max-w-content text-ink-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section tone="paper" labelledBy="not">
        <h2 id="not" className="text-3xl text-ink">
          What Netfall is not
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {[
            ['Not an exchange', 'We never hold funds and never execute a transaction.'],
            ['Not a wallet', 'We never connect to one and never ask you to.'],
            ['Not a custodian', 'Your money never touches us at any point.'],
            [
              'Not a ranking you can buy into',
              'See how we make money for exactly what that means.',
            ],
          ].map(([title, detail]) => (
            <li key={title} className="border-t border-rule pt-4">
              <p className="text-xl text-ink">{title}</p>
              <p className="mt-2 text-ink-2">{detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" labelledBy="coverage">
        <h2 id="coverage" className="text-3xl text-ink">
          Current coverage
        </h2>
        <p className="mt-5 max-w-content text-lg text-ink-2">
          {coverage.corridorCount} corridors and {coverage.providerCount} providers tracked, of
          which {coverage.liveProviderCount} answered with a live price on the last check.
          {coverage.medianDispersionBps !== null
            ? ` The median spread between best and worst was ${formatBps(coverage.medianDispersionBps)}.`
            : ' No corridor had two providers answering, so there is no spread to report yet.'}{' '}
          Every corridor has its own page.
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CORRIDORS.map((corridor) => (
            <li key={corridor.slug}>
              <Link
                href={`/compare/${corridor.slug}`}
                className="block rounded-card border border-rule bg-surface p-5 text-lg text-ink transition-colors hover:border-rule-2"
              >
                {corridor.fromName} to {corridor.toName}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
