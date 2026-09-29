import Link from 'next/link';
import type { QuoteError as QuoteErrorPayload } from '@/lib/types';
import { buttonClass } from '../ui/Button';

/**
 * §9: say what failed and what the user can do about it. No apology, no hedge.
 */
export function QuoteError({
  error,
  onRetry,
  className,
}: {
  error: QuoteErrorPayload;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={['rounded-card border border-rule-2 bg-surface p-8', className ?? ''].join(' ')}
    >
      <h3 className="text-2xl text-ink">{headline(error)}</h3>
      <p className="mt-2 max-w-content text-base text-ink-2">{error.message}</p>
      <p className="mt-2 max-w-content text-sm text-ink-2">{whatToDo(error)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={buttonClass('primary', 'md')}
          >
            Try again
          </button>
        )}
        {error.suggestion && (
          <Link
            href={`/compare/${error.suggestion}`}
            className={buttonClass('secondary', 'md')}
          >
            Compare {error.suggestion.toUpperCase().replace('-', ' to ')} instead
          </Link>
        )}
      </div>
    </div>
  );
}

function headline(error: QuoteErrorPayload): string {
  switch (error.code) {
    case 'corridor_unsupported':
      return 'We do not track this corridor';
    case 'amount_invalid':
      return 'That amount is not a number we can use';
    case 'amount_below_minimum':
      return 'That amount is too small to compare';
    case 'amount_above_maximum':
      return 'That amount is too large for the public comparison';
    case 'all_providers_failed':
      return 'No provider returned a price';
    case 'network':
      return 'We could not reach our pricing service';
  }
}

function whatToDo(error: QuoteErrorPayload): string {
  switch (error.code) {
    case 'corridor_unsupported':
      return 'Pick one of the corridors we do track, or use the closest one below.';
    case 'amount_invalid':
      return 'Enter digits only. Separators are added for you.';
    case 'amount_below_minimum':
      return 'Raise the amount until at least one provider will quote it.';
    case 'amount_above_maximum':
      return 'Amounts this size are quoted individually rather than off a public rate board.';
    case 'all_providers_failed':
      return 'Every provider in this corridor either timed out or refused. The reasons are listed below. Try again in a minute.';
    case 'network':
      return 'Check your connection and try again. Nothing was sent anywhere.';
  }
}
