import { createAlert, validateAlertInput } from '@/lib/server/alerts';
import { alertsReady } from '@/lib/server/features';
import { rateLimit, tooManyRequests } from '@/lib/server/ratelimit';

/** Create a pending alert and send its confirmation email. */
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!alertsReady()) {
    return json({ error: 'alerts_not_available', message: 'Rate alerts are not switched on yet.' }, 503);
  }
  // Each request sends an email, so this is tight on purpose.
  const limited = await rateLimit(request, 'alerts-create', 5, 3600);
  if (!limited.allowed) return tooManyRequests(limited);

  const input = validateAlertInput(await request.json().catch(() => null));
  if (!input.ok) return json({ error: 'invalid', message: input.message }, 400);

  try {
    const result = await createAlert(input);
    if (!result.ok) return json({ error: result.error, message: result.message }, result.status);
    return json({ ok: true }, 202);
  } catch {
    return json({ error: 'unavailable', message: 'Alerts are unavailable right now. Try again shortly.' }, 503);
  }
}
