import { Section, SectionHeading, type SectionTone } from './ui/Section';

export const FAQ_QUESTIONS: readonly { q: string; a: string }[] = [
  {
    q: 'Does Netfall ever hold my money?',
    a: 'No. Netfall never holds funds, never executes a transaction and never takes custody. We compare what providers offer and link you to the one you choose. The transfer happens entirely between you and them.',
  },
  {
    q: 'Do I need to connect a wallet?',
    a: 'No, and there is nothing here to connect one to. Netfall does not talk to wallets, does not ask for keys and does not deploy contracts.',
  },
  {
    q: 'How can the ranking be trusted?',
    a: 'Because it is a sort on one field — the amount that lands — in descending order, with no second input. Netfall earns nothing from any provider today. If that ever changes, the ranking stays the same sort, and every provider we earn from is labelled in the table.',
  },
  {
    q: 'Why is a provider marked "estimated"?',
    a: 'Because the figure comes from the provider’s public price feed or order book, not from a firm quote for your amount. Order depth, payment-method fees and network fees can change what actually arrives, so we mark it as an estimate rather than presenting it as exact. A figure marked “Not verified” could not be confirmed as current.',
  },
  {
    q: 'Why do some providers show no price at all?',
    a: 'Some have no public pricing API and no integration with us yet \u2014 they are listed as exactly that. Others did not answer our servers in time. We list every one with the reason instead of hiding them, because absence is information. The status page shows which providers are answering right now.',
  },
  {
    q: 'Why did the prices expire?',
    a: 'Provider rates move continuously, so a figure is only good for about a minute. When it lapses we fetch fresh prices automatically and strike through the old ones until the new ones arrive, so a stale number is never presented as current.',
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
          {FAQ_QUESTIONS.map((item) => (
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
