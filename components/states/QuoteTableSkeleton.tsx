import { QUOTE_ROW, QUOTE_ROW_CONTENT_HEIGHT } from '../quoteGrid';

/**
 * Reserves exactly the space a resolved row occupies, so nothing moves when
 * the real figures arrive. It shares the row's grid class, so it reflows with
 * the table's container rather than the viewport.
 */
export function QuoteTableSkeleton({
  rows = 6,
  showSettlement = false,
  showSuccessRate = false,
}: {
  rows?: number;
  showSettlement?: boolean;
  showSuccessRate?: boolean;
}) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="border-b border-l-[3px] border-rule border-l-transparent bg-surface last:border-b-0"
        >
          <div className={QUOTE_ROW}>
            <div
              className="flex flex-col justify-center gap-2"
              style={{ minHeight: QUOTE_ROW_CONTENT_HEIGHT }}
            >
              <Bar width="9rem" height={18} delay={index * 60} />
              <Bar width="5rem" height={11} delay={index * 60 + 30} />
            </div>
            <Bar width="7rem" height={13} delay={index * 60 + 60} />
            {showSettlement && <Bar width="4rem" height={13} delay={index * 60 + 90} />}
            {showSuccessRate && <Bar width="3rem" height={13} delay={index * 60 + 120} />}
            <div className="qamount gap-2">
              <Bar width="7rem" height={24} delay={index * 60 + 150} />
              <Bar width="4rem" height={13} delay={index * 60 + 180} />
            </div>
            <div className="qactions">
              <Bar width="7.5rem" height={36} delay={index * 60 + 210} />
              <Bar width="4.5rem" height={36} delay={index * 60 + 240} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Bar({ width, height, delay }: { width: string; height: number; delay: number }) {
  return (
    <span
      className="block animate-shimmer rounded-sm bg-surface-2"
      style={{ width, height, animationDelay: `${delay}ms` }}
    />
  );
}
