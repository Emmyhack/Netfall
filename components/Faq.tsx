import { Section, SectionHeading, type SectionTone } from './ui/Section';

const QUESTIONS: readonly { q: string; a: string }[] = [
  {
    q: 'Does Netfall ever hold my money?',
    a: 'No. Netfall never holds funds, never executes a transaction and never takes custody. We compare what providers offer and link you to the one you choose. The transfer happens entirely between you and them.',
  },
  {
    q: 'Do I need to connect a wallet?',
    a: 'No, and there is nothing here to connect one to. Netfall does not talk to wallets, does not ask for keys and does not deploy contracts.',
  },
  {
    q: 'How can the ranking be trusted if you earn commission?',
    a: 'Because the ranking is a sort on one field — the amount that lands — in descending order, with no second input. Providers that pay us nothing outrank providers that do all the time, and every provider we earn from is labelled in the table.',
  },
  {
    q: 'Why is a provider marked "estimated"?',
    a: 'Because we could not get a live quote for your exact amount and had to model the price from that provider’s recent pricing. It is close, but it is not a commitment, so we mark it rather than presenting it as exact.',
  },
  {
    q: 'Why do some providers show no price at all?',
    a: 'They timed out, their pricing service is down, or your amount falls outside their limits. We list them with the reason instead of hiding them, because a provider that never responds is something you want to know.',
  },
  {
    q: 'Why did the prices expire?',
    a: 'Provider rates move continuously, so a quote is only good for a short window. Rather than leave a stale number on screen we mark it expired and offer a refresh.',
  },
  {
    q: 'What happens above the large-amount threshold?',
    a: 'Public rates are quoted against retail liquidity. Past a certain size your own order moves the price, so the board stops describing what you would receive. Above the threshold we switch to a large-amount enquiry instead of showing figures we do not believe.',
  },
  {
    q: 'Which corridors are covered?',
    a: 'V1 covers Nigerian naira, Ghanaian cedi and Kenyan shilling into USDT and USDC. Each corridor has its own page.',
  },
];

export function Faq({ tone = 'paper' }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} labelledBy="faq-heading">
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <SectionHeading
          id="faq-heading"
          title="Frequently asked questions"
          standfirst="Mostly about whether the number can be trusted. Fair."
          size="lg"
          className="lg:sticky lg:top-8 lg:self-start"
        />

        <dl className="divide-y divide-rule border-y border-rule">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="py-8">
              <dt className="text-2xl text-ink">{item.q}</dt>
              <dd className="mt-4 max-w-content text-lg text-ink-2">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
