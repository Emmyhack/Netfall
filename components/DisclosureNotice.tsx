import Link from 'next/link';

/**
 * Rule §4.5: the commercial position is stated on every comparison surface,
 * at the point of comparison. The current position is that there is none —
 * Netfall earns nothing from any provider listed. If that ever changes the
 * affected providers get labelled in the table before anything else, and
 * this copy changes with it. Saying "we earn a commission" while no
 * agreement exists would be the exact kind of invented fact this product
 * exists to remove.
 */
export function DisclosureNotice({
  variant = 'inline',
  className,
}: {
  variant?: 'inline' | 'block';
  className?: string;
}) {
  if (variant === 'block') {
    return (
      <aside
        className={['rounded-card border border-rule bg-surface-2 p-6', className ?? ''].join(' ')}
        aria-label="Commercial disclosure"
      >
        <p className="max-w-content text-base text-ink-2">
          Netfall currently earns nothing from any provider shown here — no referral fees, no
          commissions, no placement. Ranking is by the amount that lands, and by nothing else.
          If a commercial agreement is ever signed, the affected providers will be labelled in
          the table itself.{' '}
          <Link href="/how-we-make-money" className="text-ink underline underline-offset-4">
            How we make money
          </Link>
          .
        </p>
      </aside>
    );
  }

  return (
    <p className={['max-w-content text-xs text-ink-3', className ?? ''].join(' ')}>
      Netfall currently earns nothing from any provider shown. Ranking is by landed amount only.{' '}
      <Link href="/how-we-make-money" className="text-ink-2 underline underline-offset-4">
        How we make money
      </Link>
      .
    </p>
  );
}
