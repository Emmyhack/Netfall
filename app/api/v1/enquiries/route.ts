import { submitEnquiry, validateEnquiry } from '@/lib/server/enquiries';
import { enquiriesReady } from '@/lib/server/features';
import { rateLimit, tooManyRequests } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!enquiriesReady()) {
    return json({ error: 'enquiries_not_available', message: 'Large-amount enquiries are not open yet.' }, 503);
  }
  const limited = await rateLimit(request, 'enquiries', 5, 3600);
  if (!limited.allowed) return tooManyRequests(limited);

  const input = validateEnquiry(await request.json().catch(() => null));
  if (!input.ok) return json({ error: 'invalid', message: input.message }, 400);

  try {
    const { id } = await submitEnquiry(input.value);
    return json({ ok: true, id }, 201);
  } catch {
    return json({ error: 'unavailable', message: 'We could not send your enquiry. Try again shortly.' }, 503);
  }
}
