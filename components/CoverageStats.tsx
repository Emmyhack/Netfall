import Link from 'next/link';
import { formatBps } from '@/lib/format';
import { computeCoverage } from '@/lib/coverage';
import { Section, SectionHeading, type SectionTone } from './ui/Section';

/** Every figure is measured from the data layer, never written into markup. */
export async function CoverageStats({ tone = 'paper' }: { tone?: SectionTone }) {
  const coverage = await computeCoverage();

  const stats = [
    { value: String(coverage.corridorCount), label: 'corridors tracked' },
    { value: String(coverage.providerCount), label: 'providers compared' },
    { value: formatBps(coverage.medianDispersionBps), label: 'median spread, best to worst' },
  ];

  return (
    <Section tone={tone} labelledBy="coverage-heading">
      <SectionHeading
        id="coverage-heading"
        title="What Netfall measures today"
        standfirst="Three numbers, all of them read from the same data the comparison runs on."
      />

      <dl className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border-t border-rule-2 pt-6">
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="numeric block text-display font-medium text-ink">{stat.value}</span>
              <span className="mt-4 block text-lg text-ink-2">{stat.label}</span>
            </dd>
          </div>
        ))}
      </dl>

      {coverage.widestCorridor && (
        <p className="mt-16 max-w-content text-lg text-ink-2">
          The widest corridor right now is{' '}
          <Link
            href={`/compare/${coverage.widestCorridor.slug}`}
            className="text-ink underline underline-offset-4"
          >
            {coverage.widestCorridor.from} to {coverage.widestCorridor.to}
          </Link>
          , where best and worst are {formatBps(coverage.widestCorridor.dispersionBps)} apart on a
          typical amount.
        </p>
      )}
    </Section>
  );
}
