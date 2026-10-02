import { formatMoney } from '@/lib/format';
import { compare } from '@/lib/money';
import type { HistoryPoint } from '@/lib/server/history';
import type { CorridorMeta } from '@/lib/types';

const W = 640;
const H = 160;
const PAD = 8;

/**
 * Seven days of the corridor's best price, drawn on the server as a plain
 * SVG: no client JavaScript, nothing added to the first-load bundle.
 *
 * Plotted values are fiat per one unit of the asset, so lower is better for
 * the sender. Numbers are converted to floats for geometry only; every
 * figure shown as text is the stored decimal string.
 */
export function RateHistory({ points, corridor }: { points: HistoryPoint[]; corridor: CorridorMeta }) {
  if (points.length < 2) return null;

  const values = points.map((p) => Number(p.r));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const t0 = points[0]!.t;
  const tSpan = points[points.length - 1]!.t - t0 || 1;

  const path = points
    .map((p, i) => {
      const x = PAD + ((p.t - t0) / tSpan) * (W - PAD * 2);
      const y = PAD + (1 - (Number(p.r) - min) / span) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const latest = points[points.length - 1]!;
  const lowest = points.reduce((a, b) => (compare(b.r, a.r) < 0 ? b : a));
  const highest = points.reduce((a, b) => (compare(b.r, a.r) > 0 ? b : a));
  const fmt = (r: string) => formatMoney(r, corridor.from, { decimals: 2 });
  const days = Math.max(1, Math.round(tSpan / (24 * 3600 * 1000)));

  return (
    <figure className="rounded-card border border-rule bg-surface p-6">
      <figcaption className="text-sm text-ink-3">
        Best price for 1 {corridor.to}, last {days === 1 ? 'day' : `${days} days`}. Lower is
        better for you. Measured every 15 minutes on a{' '}
        {formatMoney(corridor.defaultAmount, corridor.from, { decimals: 0 })} transfer.
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-5 h-40 w-full text-ink"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Best price ranged from ${fmt(lowest.r)} to ${fmt(highest.r)} per ${corridor.to}; latest ${fmt(latest.r)}.`}
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
        {[
          ['Latest', latest.r],
          ['Lowest', lowest.r],
          ['Highest', highest.r],
        ].map(([label, value]) => (
          <div key={label} className="border-t border-rule pt-3">
            <dt className="text-ink-3">{label}</dt>
            <dd className="numeric mt-1 text-lg text-ink">{fmt(value!)}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
