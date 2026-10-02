import type { Metadata } from 'next';
import { CodeSnippet } from '@/components/CodeSnippet';
import { ButtonLink, Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { computeCoverage } from '@/lib/coverage';
import { CORRIDORS } from '@/lib/corridors';
import { liveApiSample, SAMPLE_ENDPOINT } from '@/lib/server/apiSample';

/** Live figures refresh on this cadence rather than freezing at build. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Netfall API',
  description:
    'Read the same comparison programmatically: every provider in a corridor, ranked by landed amount, with the ones that could not quote and why.',
  alternates: { canonical: '/api' },
};


const QUOTE_REQUEST = `curl "${SAMPLE_ENDPOINT}"`;

const TYPES = `const response = await fetch('${SAMPLE_ENDPOINT}');
if (!response.ok) throw new Error((await response.json()).message);

const comparison = await response.json();

// Already sorted by landed amount, descending. Nothing else affects the order.
const best = comparison.quotes[0];

// Monetary values are decimal strings. Never parse them into a number.
console.log(best?.landedAmount, best?.confidence);`;

export default async function ApiPage() {
  const [coverage, sample] = await Promise.all([computeCoverage(), liveApiSample()]);

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Free · no key · fair use</Pill>
          <h1 className="text-display text-ink">Netfall API</h1>
          <p className="mt-6 max-w-content text-lg text-ink-2">
            One call returns every provider in a corridor, ranked by how much actually lands, with
            the ones that could not quote and the reason each of them failed. It is the same data
            behind the pages on this site, in the same order, with the same guarantees.
          </p>
          <p className="mt-6 max-w-content text-ink-2">
            It is open now. Send a GET request; there is no key to apply for. Each address can
            make 60 requests a minute, and identical requests within a few seconds are answered
            from cache. Above that, you get a 429 with a Retry-After header.
          </p>
        </div>
      </section>

      <Section tone="paper" labelledBy="quote">
        <h2 id="quote" className="text-3xl text-ink">
          Getting a comparison
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <CodeSnippet code={QUOTE_REQUEST} language="bash" label="Request" />
          {sample ? (
            <CodeSnippet
              code={sample.json}
              language="json"
              label={`Real response, ${sample.at.slice(11, 16)} UTC (trimmed)`}
            />
          ) : (
            <p className="rounded-card border border-rule bg-surface p-6 text-ink-2">
              No sample right now: the providers did not answer when this page was last
              generated. The request on the left still works — try it.
            </p>
          )}
        </div>
        <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {[
            ['corridor', `One of ${CORRIDORS.map((c) => c.slug).join(', ')}. Uppercase ids work too.`],
            [
              'amount',
              'A decimal string in the source currency, between the corridor minimum and its large-amount threshold. Both are listed at /api/v1/corridors.',
            ],
            ['Errors', 'JSON with error and message: corridor_unsupported, amount_invalid, below_minimum, above_public_range, rate_limited.'],
            ['Also available', '/api/v1/corridors for what is accepted, /api/v1/status for which providers are answering.'],
          ].map(([term, detail]) => (
            <div key={term} className="border-t border-rule pt-4">
              <dt className="numeric text-sm text-ink">{term}</dt>
              <dd className="mt-2 text-ink-2">{detail}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="paper" labelledBy="typed">
        <h2 id="typed" className="text-3xl text-ink">
          From JavaScript
        </h2>
        <CodeSnippet className="mt-10" code={TYPES} language="ts" label="compare.ts" />
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
