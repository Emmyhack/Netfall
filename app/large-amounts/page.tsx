import type { Metadata } from 'next';
import { LargeAmountFlow } from '@/components/LargeAmountFlow';
import { Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import { formatMoney } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Large amounts',
  description:
    'Above a certain size, public stablecoin rates stop describing what you would actually receive. Tell us the shape of the trade and we will take it to desks that quote it.',
  alternates: { canonical: '/large-amounts' },
};

export default function LargeAmountsPage() {
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Negotiated pricing</Pill>
          <h1 className="text-display text-ink">Large amounts</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            A rate board quotes retail liquidity. Past a certain size your own order moves the
            price against you, and the figure on the board stops being the figure you receive. At
            that point the honest answer is not a better ranking — it is a negotiated quote.
          </p>
        </div>
      </section>

      <Section tone="paper">
        <LargeAmountFlow />
      </Section>

      <Section tone="white" labelledBy="thresholds">
        <h2 id="thresholds" className="text-3xl">
          Where the board stops working
        </h2>
        <p className="mt-5 max-w-content text-lg text-ink-2">
          The threshold is different in every corridor, because the depth is. These are the points
          at which we stop showing public rates and start asking questions instead.
        </p>
        <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {CORRIDORS.map((corridor) => (
            <li
              key={corridor.slug}
              className="flex items-baseline justify-between gap-4 border-t border-rule pt-4"
            >
              <span>
                {corridor.from} to {corridor.to}
              </span>
              <span className="numeric text-lg">
                {formatMoney(corridor.otcThreshold, corridor.from, { decimals: 0 })}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" labelledBy="what-we-do-not-do">
        <h2 id="what-we-do-not-do" className="text-3xl text-ink">
          What we do not do
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {[
            ['We never hold your money', 'At any point, at any size.'],
            ['We do not execute the trade', 'The desk you choose does, directly with you.'],
            ['We take no spread on your order', 'We are paid a referral fee or nothing at all.'],
            [
              'We do not sell your enquiry',
              'It goes to desks that quote the corridor, not to a broker list.',
            ],
          ].map(([title, detail]) => (
            <li key={title} className="border-t border-rule pt-4">
              <p className="text-xl text-ink">{title}</p>
              <p className="mt-2 text-ink-2">{detail}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
