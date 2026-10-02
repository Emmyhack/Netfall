import { computeCoverage } from '@/lib/coverage';
import { liveApiSample, SAMPLE_ENDPOINT } from '@/lib/server/apiSample';
import { CodeSnippet } from './CodeSnippet';
import { ButtonLink } from './ui/Button';
import { Section, SectionHeading, type SectionTone } from './ui/Section';

const REQUEST = `curl "${SAMPLE_ENDPOINT}"`;

export async function DeveloperSection({ tone = 'paper' }: { tone?: SectionTone }) {
  const [coverage, sample] = await Promise.all([
    computeCoverage(),
    liveApiSample({ quotes: 1, unavailable: 1 }),
  ]);

  return (
    <Section tone={tone} labelledBy="developers-heading">
      <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <SectionHeading
            id="developers-heading"
            title="The same numbers, as an API"
            standfirst="One call returns every provider in a corridor, ranked by what lands, with the ones that could not quote and why. Free, no key."
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
          {sample && (
            <CodeSnippet
              code={sample.json}
              language="json"
              label={`Real response, ${sample.at.slice(11, 16)} UTC (trimmed)`}
            />
          )}
        </div>
      </div>
    </Section>
  );
}
