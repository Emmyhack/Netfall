import { evaluateAlerts } from '@/lib/server/alerts';
import { alertsReady, cronAuthorised } from '@/lib/server/features';
import { recordTick } from '@/lib/server/history';
import { redisConfigured } from '@/lib/server/redis';
import { measureCorridors } from '@/lib/server/snapshot';

/**
 * The scheduled tick, called every 15 minutes by the GitHub Actions workflow
 * in .github/workflows/tick.yml (or Vercel Cron on a plan that allows it).
 * Authorised by `Authorization: Bearer $CRON_SECRET`; anything else is a 401
 * so the endpoint cannot be used to make us hammer providers.
 *
 * One measurement feeds three things: rate history, provider reliability
 * and alert evaluation.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function tick(request: Request) {
  if (!cronAuthorised(request)) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }
  if (!redisConfigured()) {
    return Response.json({ error: 'storage_not_configured' }, { status: 503 });
  }

  const started = Date.now();
  const { snapshots, responses } = await measureCorridors();
  await recordTick(snapshots, responses);
  const alerts = alertsReady() ? await evaluateAlerts(snapshots) : null;

  return Response.json(
    {
      ok: true,
      tookMs: Date.now() - started,
      corridorsMeasured: responses.size,
      corridorsPriced: snapshots.size,
      alerts,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export const GET = tick;
export const POST = tick;
