import Link from 'next/link';

/**
 * Rule §4.5: the commercial relationship is stated on every comparison
 * surface, at the point of comparison, not buried in the footer.
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
          Netfall earns a referral commission from some of the providers listed here. It does not
          affect the ranking: providers are ordered by how much actually lands, and by nothing
          else. Providers we earn from are marked in the table.{' '}
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
      We earn a commission from some providers, marked in the table. Ranking is by landed amount
      only.{' '}
      <Link href="/how-we-make-money" className="text-ink-2 underline underline-offset-4">
        How we make money
      </Link>
      .
    </p>
  );
}
