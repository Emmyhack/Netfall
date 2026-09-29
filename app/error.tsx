'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';

/**
 * The route-level error boundary. §11: say what happened and what the reader
 * can do, without apologising or hedging.
 *
 * LIVE: report `error.digest` to the error tracker here. The digest is the
 * only identifier that ties this render to the server-side stack, which is
 * deliberately not sent to the browser.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Route error', error);
  }, [error]);

  return (
    <Section tone="paper" size="lg">
      <h1 className="text-display text-ink">This page stopped working</h1>
      <p className="mt-8 max-w-content text-lead text-ink-3">
        Something failed while rendering it. Nothing you did caused this, and nothing was sent
        anywhere — Netfall never holds funds or executes transfers.
      </p>
      <p className="mt-6 max-w-content text-ink-2">
        Try again. If it keeps happening, the comparison for a specific corridor is often still
        fine, so go straight to one.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button variant="primary" size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/compare/ngn-usdt" variant="secondary" size="lg">
          Go to NGN to USDT
        </ButtonLink>
      </div>

      {error.digest && (
        <p className="mt-10 text-sm text-ink-3">
          Reference <span className="numeric">{error.digest}</span> — quote this if you report it.
        </p>
      )}
    </Section>
  );
}
