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
