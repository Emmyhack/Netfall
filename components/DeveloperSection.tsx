import { computeCoverage } from '@/lib/coverage';
import { CodeSnippet } from './CodeSnippet';
import { ButtonLink } from './ui/Button';
import { Section, SectionHeading, type SectionTone } from './ui/Section';

const REQUEST = `curl https://api.netfall.io/v1/quote \\
  -H "Authorization: Bearer $NETFALL_KEY" \\
  -d corridor=NGN-USDT \\
  -d amount=500000`;

const RESPONSE = `{
  "corridor": "NGN-USDT",
  "inputAmount": "500000",
  "dispersionBps": 287,
  "expiresAt": "2026-09-19T14:22:31Z",
  "quotes": [
    {
      "provider": "yellowcard",
      "landedAmount": "310.67",
      "effectiveRate": "0.000621340000",
      "confidence": "exact",
      "source": "direct",
      "settlementEstimateSeconds": 420
    }
  ],
  "unavailable": [
    { "provider": "moonpay", "reason": "below_minimum" }
  ]
}`;

export function DeveloperSection({ tone = 'paper' }: { tone?: SectionTone }) {
  const coverage = computeCoverage();

  return (
    <Section tone={tone} labelledBy="developers-heading">
      <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <SectionHeading
            id="developers-heading"
            title="The same numbers, as an API"
            standfirst="One call returns every provider in a corridor, ranked by what lands, with the ones that could not quote and why."
            size="lg"
          />

          <dl className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="border-t border-rule-2 pt-4">
              <dt className="text-sm text-ink-3">Corridors</dt>
              <dd className="numeric mt-2 text-3xl text-ink">{coverage.corridorCount}</dd>
            </div>
            <div className="border-t border-rule-2 pt-4">
              <dt className="text-sm text-ink-3">Providers</dt>
              <dd className="numeric mt-2 text-3xl text-ink">{coverage.providerCount}</dd>
            </div>
            <div className="border-t border-rule-2 pt-4">
              <dt className="text-sm text-ink-3">Money type</dt>
              <dd className="mt-2 text-xl text-ink">Decimal strings</dd>
            </div>
          </dl>

          <ButtonLink href="/api" variant="primary" size="lg" className="mt-12">
            Read the API overview
          </ButtonLink>
        </div>

        <div className="grid gap-4">
          <CodeSnippet code={REQUEST} language="bash" label="Request" />
          <CodeSnippet code={RESPONSE} language="json" label="Response" />
        </div>
      </div>
    </Section>
  );
}
