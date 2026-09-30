import type { Metadata } from 'next';
import { ButtonLink, Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import { listProviders } from '@/lib/quotes/source';

export const metadata: Metadata = {
  title: 'How we make money',
  description:
    'Netfall earns a referral commission from some providers. It has no effect on ranking. Here is exactly how the money works and which providers pay us.',
  alternates: { canonical: '/how-we-make-money' },
};

const RULES = [
  [
    'Ranking is by landed amount alone',
    'Nothing else is an input. There is no sponsored placement and no paid boost, and there never will be.',
  ],
  [
    'Relationships are labelled at the point of comparison',
    'Not in the footer, not in a policy page nobody opens. In the table, next to the provider, every time.',
  ],
  [
    'Providers who cannot quote are still shown',
    'Including ones we earn from. A partner that times out appears as a partner that timed out.',
  ],
  [
    'No figure is adjusted to flatter a partner',
    'If a breakdown does not reconcile we show an error, not a rounded number that happens to add up.',
  ],
];

export default async function HowWeMakeMoneyPage() {
  const providers = await listProviders();
  const paying = providers.filter((p) => p.hasCommercialRelationship);
  const notPaying = providers.filter((p) => !p.hasCommercialRelationship);

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Commercial disclosure</Pill>
          <h1 className="text-display max-w-[54rem] text-ink">How we make money</h1>
          <div className="mt-8 max-w-content space-y-5 text-lg text-ink-2">
            <p>
              Netfall earns a referral commission when you follow a link to some of the providers
              we list and complete a transfer. You pay nothing extra: the commission comes out of
              the provider&rsquo;s own margin, and the rate you get is the rate we showed you.
            </p>
            <p>
              The commission has no effect on where a provider appears. Ranking is a sort on one
              field — the amount that lands — in descending order. There is no weighting, no
              tiebreak in a partner&rsquo;s favour, and no way for a commercial team to change it.
              Providers who pay us nothing outrank providers who do, constantly, and we publish it
              that way.
            </p>
          </div>
        </div>
      </section>

      <Section tone="paper" labelledBy="who-pays">
        <h2 id="who-pays" className="text-3xl text-ink">
          Who pays us and who does not
        </h2>
        <p className="mt-5 max-w-content text-lg text-ink-2">
          Every provider we track. This list is generated from the same configuration that drives
          the comparison tables, so it cannot drift out of date.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {[
            { title: 'We earn a commission', list: paying, tone: 'caution' as const },
            { title: 'We earn nothing', list: notPaying, tone: 'neutral' as const },
          ].map((group) => (
            <div key={group.title} className="rounded-card border border-rule bg-surface p-6">
              <h3 className="text-xl text-ink">
                {group.title}{' '}
                <span className="numeric text-ink-3">({group.list.length})</span>
              </h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {group.list.map((provider) => (
                  <li key={provider.slug}>
                    <Pill tone={group.tone}>
                      {provider.name}
                      {provider.source === 'aggregator' && (
                        <span className="ml-2 text-ink-3">aggregator</span>
                      )}
                    </Pill>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="white" labelledBy="rules">
        <h2 id="rules" className="text-3xl">
          The rules we hold ourselves to
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2">
          {RULES.map(([title, detail], index) => (
            <li key={title} className="border-t border-rule pt-5">
              <span className="numeric text-sm text-ink-2">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 text-xl">{title}</p>
              <p className="mt-2 max-w-content text-ink-2">{detail}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="paper" labelledBy="if-asked">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="if-asked" className="text-3xl text-ink">
              If a partner asked us to rank them higher
            </h2>
            <p className="mt-5 max-w-content text-lg text-ink-2">
              We would say no, and we would keep listing them on their merits. The only thing
              Netfall sells is the credibility of one number. A ranking that can be bought is
              worth nothing to a user, and a comparison nobody trusts is worth nothing to a
              provider either.
            </p>
          </div>

          <div>
            <h2 className="text-3xl text-ink">Where else revenue comes from</h2>
            <dl className="mt-5 space-y-5">
              {[
                [
                  'Large-amount enquiries',
                  'Above a corridor threshold we route enquiries to desks that quote that size, and are paid a referral fee on completion.',
                ],
                ['The API', 'Businesses that read the comparison programmatically pay for access.'],
                [
                  'Nothing from your data',
                  'We do not sell it, and in this build nothing you type into a form leaves your browser.',
                ],
              ].map(([term, detail]) => (
                <div key={term} className="border-t border-rule pt-4">
                  <dt className="text-lg text-ink">{term}</dt>
                  <dd className="mt-1 max-w-content text-ink-2">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <ButtonLink href={`/compare/${CORRIDORS[0]?.slug}`} variant="primary" size="lg" className="mt-12">
          Back to the comparison
        </ButtonLink>
      </Section>
    </>
  );
}
