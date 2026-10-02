/**
 * Server startup hook.
 *
 * IPv4-first DNS ordering, because it was measured, not assumed: the market
 * data hosts publish AAAA records, and on networks where IPv6 routes badly
 * Node's default ordering stalled ~2 seconds per upstream call before
 * falling back — enough, under parallel connector fetches, to blow the
 * upstream timeout and report a perfectly healthy venue as unreachable.
 * With ipv4first the same call answers in under 700ms.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('node:dns');
    dns.setDefaultResultOrder('ipv4first');
  }
}

/**
 * Every unhandled server error, as one JSON line. Vercel's log view and any
 * log drain can filter on `"event":"server_error"`; the digest is what the
 * error page shows the visitor, so a report can be matched to its trace.
 */
export function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
): void {
  const err = error as Error & { digest?: string };
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      event: 'server_error',
      digest: err?.digest ?? null,
      message: err?.message ?? String(error),
      method: request.method,
      path: request.path,
      route: context.routePath,
      routeType: context.routeType,
      stack: err?.stack?.split('\n').slice(0, 6).join('\n') ?? null,
    }),
  );
}
