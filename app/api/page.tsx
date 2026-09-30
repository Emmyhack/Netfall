import type { Metadata } from 'next';
import { CodeSnippet } from '@/components/CodeSnippet';
import { ButtonLink, Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { computeCoverage } from '@/lib/coverage';
import { CORRIDORS } from '@/lib/corridors';

export const metadata: Metadata = {
  title: 'Netfall API',
  description:
    'Read the same comparison programmatically: every provider in a corridor, ranked by landed amount, with the ones that could not quote and why.',
  alternates: { canonical: '/api' },
};

const QUOTE_REQUEST = `curl https://api.netfall.io/v1/quote \\
  -H "Authorization: Bearer $NETFALL_KEY" \\
  -d corridor=NGN-USDT \\
  -d amount=500000`;

const QUOTE_RESPONSE = `{
  "requestId": "req_8f2a91c",
  "corridor": "NGN-USDT",
  "inputAmount": "500000",
  "generatedAt": "2026-09-19T14:21:01Z",
  "expiresAt": "2026-09-19T14:22:31Z",
  "dispersionBps": 287,
  "quotes": [
    {
      "provider": "binance-p2p",
      "providerName": "Binance P2P",
      "source": "direct",
      "landedAmount": "314.73",
      "effectiveRate": "0.000629460000",
      "confidence": "exact",
      "settlementEstimateSeconds": 3600,
      "successRate30d": 0.903,
      "hasCommercialRelationship": false,
      "feeBreakdown": [
        { "label": "Amount at mid-market rate", "amount": "316.37", "currency": "USDT" },
        { "label": "Provider rate margin", "amount": "-1.64", "currency": "USDT" }
      ]
    }
  ],
  "unavailable": [
    { "provider": "busha", "providerName": "Busha", "reason": "timeout" }
  ]
}`;

const TYPES = `import type { QuoteResponse } from '@netfall/types';

const response = await fetch('https://api.netfall.io/v1/quote?corridor=NGN-USDT&amount=500000', {
  headers: { Authorization: \`Bearer \${process.env.NETFALL_KEY}\` },
});

const quote: QuoteResponse = await response.json();

// Already sorted by landed amount, descending. Nothing else affects the order.
const best = quote.quotes[0];

// Monetary values are decimal strings. Never parse them into a number.
console.log(best.landedAmount, best.confidence);`;

export default async function ApiPage() {
  const coverage = await computeCoverage();

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Not open yet</Pill>
          <h1 className="text-display text-ink">Netfall API</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            One call returns every provider in a corridor, ranked by how much actually lands, with
            the ones that could not quote and the reason each of them failed. It is the same data
            behind the pages on this site, in the same order, with the same guarantees.
          </p>
          <p className="mt-6 max-w-content rounded-card border border-caution bg-caution-soft px-5 py-4 text-caution">
            The API is not open yet. This page describes the contract we are building against.
          </p>
        </div>
      </section>

      <Section tone="paper" labelledBy="quote">
        <h2 id="quote" className="text-3xl text-ink">
          Getting a comparison
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <CodeSnippet code={QUOTE_REQUEST} language="bash" label="Request" />
          <CodeSnippet code={QUOTE_RESPONSE} language="json" label="Response" />
        </div>
      </Section>

      <Section tone="paper" labelledBy="typed">
        <h2 id="typed" className="text-3xl text-ink">
          In TypeScript
        </h2>
        <CodeSnippet className="mt-10" code={TYPES} language="ts" label="quote.ts" />
      </Section>

      <Section tone="white" labelledBy="guarantees">
        <h2 id="guarantees" className="text-3xl">
          What the contract guarantees
        </h2>
        <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              term: 'Quotes are pre-sorted',
              detail:
                'By landedAmount, descending. You do not need to sort, and you cannot get a different order by asking for one.',
            },
            {
              term: 'Money is a decimal string',
              detail:
                'Never a float, at any depth of the response. Parse with a decimal library, not Number().',
            },
            {
              term: 'Confidence is always present',
              detail:
                'exact, estimated or insufficient_data on every quote. If you surface our figures, surface the confidence with them.',
            },
            {
              term: 'Failures are returned, not dropped',
              detail:
                'The unavailable array names every provider that could not quote and why. An empty corridor still tells you something.',
            },
            {
              term: 'Quotes expire',
              detail:
                'expiresAt is authoritative. Past it, the figures are stale and must not be presented as live.',
            },
            {
              term: 'Commercial relationships are flagged',
              detail:
                'hasCommercialRelationship tells you where we earn. It has no bearing on the order and you should disclose it too.',
            },
          ].map((item) => (
            <div key={item.term} className="border-t border-rule pt-5">
              <dt className="text-xl">{item.term}</dt>
              <dd className="mt-2 max-w-content text-ink-2">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="paper" labelledBy="coverage">
        <h2 id="coverage" className="text-3xl text-ink">
          Coverage
        </h2>
        <dl className="mt-12 grid gap-8 sm:grid-cols-3">
          <div className="border-t border-rule-2 pt-5">
            <dt className="text-sm text-ink-3">Corridors</dt>
            <dd className="numeric mt-2 text-display font-medium text-ink">{coverage.corridorCount}</dd>
          </div>
          <div className="border-t border-rule-2 pt-5">
            <dt className="text-sm text-ink-3">Providers</dt>
            <dd className="numeric mt-2 text-display font-medium text-ink">{coverage.providerCount}</dd>
          </div>
          <div className="border-t border-rule-2 pt-5">
            <dt className="text-sm text-ink-3">Corridor identifiers</dt>
            <dd className="mt-2 text-ink-2">{CORRIDORS.map((c) => c.id).join(', ')}</dd>
          </div>
        </dl>
      </Section>

      <Section tone="paper" labelledBy="who">
        <h2 id="who" className="text-3xl text-ink">
          Who this is for
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-3">
          {[
            'Payout platforms choosing a route per transaction instead of per integration.',
            'Treasury and finance teams that have to evidence they took the best available rate.',
            'Products that show their users a rate and would rather show a defensible one.',
          ].map((item) => (
            <li key={item} className="border-t border-rule pt-4 text-lg text-ink-2">
              {item}
            </li>
          ))}
        </ul>
        <ButtonLink href="/about" variant="primary" size="lg" className="mt-12">
          How the landed amount is calculated
        </ButtonLink>
      </Section>
    </>
  );
}
