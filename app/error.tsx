'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';

/**
 * The route-level error boundary. §11: say what happened and what the reader
 * can do, without apologising or hedging.
 *
 * The digest is reported to /api/v1/client-errors, which logs it beside the
 * server's own onRequestError line for the same digest (instrumentation.ts):
 * the only link between this render and the stack, which is deliberately
 * not sent to the browser.
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
    // Report the reference, never the visitor's data. sendBeacon survives
    // the visitor navigating away and never blocks the page.
    try {
      navigator.sendBeacon?.(
        '/api/v1/client-errors',
        JSON.stringify({ digest: error.digest, message: error.message, path: location.pathname }),
      );
    } catch {
      /* reporting must never cause a second failure */
    }
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
