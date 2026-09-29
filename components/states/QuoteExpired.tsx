/**
 * §9 and rule §4.7: an expired quote is an error state, never a stale success.
 * The figures behind this banner are struck through, so it is never ambiguous
 * whether they are still on offer.
 */
export function QuoteExpired({
  generatedAt,
  onRefresh,
  className,
}: {
  generatedAt: string;
  onRefresh: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col gap-4 rounded-card border border-caution bg-caution-soft p-5 sm:flex-row sm:items-center sm:justify-between',
        className ?? '',
      ].join(' ')}
    >
      <div>
        <p className="text-lg font-medium text-caution">These prices have expired</p>
        <p className="mt-1 max-w-content text-sm text-ink-2">
          Providers quoted them at {timeOf(generatedAt)} and they are no longer valid. Refresh to
          see what is on offer now.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="shrink-0 rounded-pill border border-caution px-5 py-3 text-sm font-medium text-caution transition-colors hover:bg-surface"
      >
        Refresh prices
      </button>
    </div>
  );
}

function timeOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'an unknown time';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
