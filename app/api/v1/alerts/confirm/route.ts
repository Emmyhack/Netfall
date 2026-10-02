import { confirmAlert } from '@/lib/server/alerts';
import { verifyToken } from '@/lib/server/tokens';

/**
 * Form POST from /alerts/confirm. Confirmation is a POST behind a button,
 * never a GET: mail scanners open every link in a message, and a GET that
 * confirmed would confirm alerts nobody asked for.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const id = verifyToken(form?.get('token')?.toString(), 'confirm');
  let state = 'invalid';
  if (id) {
    const outcome = await confirmAlert(id).catch(() => 'error' as const);
    state = outcome === 'confirmed' || outcome === 'already' ? 'confirmed' : outcome === 'missing' ? 'expired' : 'error';
  }
  return Response.redirect(new URL(`/alerts/result/${state}`, request.url), 303);
}
