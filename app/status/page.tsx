import type { Metadata } from 'next';
import { Pill } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { CORRIDORS } from '@/lib/corridors';
import { computeStatus, type ProbeOutcome } from '@/lib/status';

export const metadata: Metadata = {
  title: 'Provider status',
  description:
    'Which providers are returning live prices right now, corridor by corridor, measured with a real quote request.',
  alternates: { canonical: '/status' },
};

/** Re-measured at most once a minute; every visit in between sees the same snapshot. */
export const revalidate = 60;

const REASON: Record<string, string> = {
  not_configured: 'No live integration yet',
  provider_down: 'Not responding',
  timeout: 'Too slow to answer',
  below_minimum: 'Amount below their minimum',
  above_maximum: 'Amount above their maximum',
  insufficient_data: 'Not enough market data',
  corridor_unsupported: 'Corridor not offered',
  no_response: 'No answer',
};

function Cell({ outcome }: { outcome: ProbeOutcome | undefined }) {
  if (!outcome) return <span className="text-ink-3">—</span>;
  if (outcome.ok) {
    return (
      <span className="inline-flex items-center gap-2 text-ink">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-best" />
        Live price
      </span>
    );
  }
  const notBuilt = outcome.reason === 'not_configured';
  return (
    <span className={`inline-flex items-center gap-2 ${notBuilt ? 'text-ink-3' : 'text-caution'}`}>
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${notBuilt ? 'border border-rule-2' : 'bg-caution'}`}
      />
      {REASON[outcome.reason] ?? 'No answer'}
    </span>
  );
}

export default async function StatusPage() {
  const report = await computeStatus();
  const checked = new Date(report.checkedAt);
  const answering = report.providers.filter((p) =>
    Object.values(p.corridors).some((o) => o.ok),
  ).length;

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 pb-16 pt-12 sm:px-6">
          <Pill className="mb-6">Measured, not declared</Pill>
          <h1 className="text-display max-w-[54rem] text-ink">Provider status</h1>
          <p className="mt-8 max-w-content text-lg text-ink-2">
            {answering} of {report.providers.length} providers returned a live price on the last
            check. Each cell is a real quote request at that corridor&rsquo;s default amount,
            taken at{' '}
            <time dateTime={report.checkedAt} className="numeric">
              {checked.toISOString().slice(11, 16)} UTC
            </time>{' '}
            and re-taken at most once a minute.
          </p>
        </div>
      </section>

      <Section tone="white" labelledBy="status-table">
        <h2 id="status-table" className="sr-only">
          Status by provider and corridor
        </h2>
        <div className="overflow-x-auto rounded-card border border-rule">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-surface-2 text-ink-3">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Provider
                </th>
                {CORRIDORS.map((c) => (
                  <th key={c.slug} scope="col" className="px-5 py-3 font-medium">
                    {c.from} → {c.to}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.providers.map((p) => (
                <tr key={p.slug} className="border-t border-rule">
                  <th scope="row" className="px-5 py-4 font-medium text-ink">
                    {p.name}
                  </th>
                  {CORRIDORS.map((c) => (
                    <td key={c.slug} className="px-5 py-4">
                      <Cell outcome={p.corridors[c.slug]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-content text-sm text-ink-3">
          &ldquo;No live integration yet&rdquo; means we track the provider but cannot read its
          prices: it has no public price feed, or its partner API needs credentials we do not
          hold. The same data is available as JSON at{' '}
          <a href="/api/v1/status" className="underline underline-offset-4">
            /api/v1/status
          </a>
          .
        </p>
      </Section>
    </>
  );
}
