import Link from 'next/link';
import { CORRIDORS } from '@/lib/corridors';
import type { CorridorMeta } from '@/lib/types';
import { buttonClass } from '../ui/Button';

/** §9 empty state: which corridors are supported, and the nearest one. */
export function CorridorUnsupported({
  requested,
  nearest,
  className,
}: {
  /** The corridor that was asked for, when we know it. */
  requested?: string;
  nearest: CorridorMeta;
  className?: string;
}) {
  return (
    <div className={['rounded-card border border-rule-2 bg-surface p-8', className ?? ''].join(' ')}>
      <h2 className="text-3xl text-ink">
        {requested
          ? `Netfall does not track ${requested.toUpperCase().replace('-', ' to ')}`
          : 'Netfall does not track that corridor'}
      </h2>
      <p className="mt-2 max-w-content text-base text-ink-2">
        V1 covers three African currencies into the two largest dollar stablecoins. The closest
        corridor we do measure is {nearest.from} to {nearest.to}.
      </p>

      <Link
        href={`/compare/${nearest.slug}`}
        className={buttonClass('primary', 'lg', 'mt-6')}
      >
        Compare {nearest.from} to {nearest.to}
      </Link>

      <h3 className="mt-10 text-base font-medium text-ink">Everything we track</h3>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {CORRIDORS.map((corridor) => (
          <li key={corridor.slug}>
            <Link
              href={`/compare/${corridor.slug}`}
              className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
            >
              {corridor.fromName} to {corridor.toName} ({corridor.from} to {corridor.to})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
