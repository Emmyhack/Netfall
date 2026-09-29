import { Section, SectionHeading, type SectionTone } from './ui/Section';

const STEPS = [
  {
    n: '01',
    title: 'Start at the mid-market rate',
    body: 'The reference price, before anybody has taken anything out of it.',
  },
  {
    n: '02',
    title: 'Subtract the rate margin',
    body: 'The gap between a provider’s rate and mid-market is a cost, whatever they call it. We itemise it as one.',
  },
  {
    n: '03',
    title: 'Subtract every stated fee',
    body: 'Percentage fees, flat fees, network withdrawal fees, mobile-money tariffs.',
  },
  {
    n: '04',
    title: 'Rank on what is left',
    body: 'That is the landed amount, and it is the only figure the ranking looks at.',
  },
];

export function HowItWorks({ tone = 'paper' }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} labelledBy="how-heading">
      <SectionHeading
        id="how-heading"
        title="How the number is built"
        standfirst="Four subtractions, shown in full on every row. If the parts do not sum to the whole we show an error rather than a tidy number."
      />

      <ol className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.n} className="border-t border-rule-2 pt-6">
            <span className="numeric text-sm text-ink-3">{step.n}</span>
            <h3 className="mt-6 text-2xl text-ink">{step.title}</h3>
            <p className="mt-4 text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
