import { deleteAlert } from '@/lib/server/alerts';
import { verifyToken } from '@/lib/server/tokens';

/**
 * Two callers: the button on /alerts/unsubscribe (form POST, then a
 * redirect), and mail clients performing RFC 8058 one-click unsubscribe,
 * which POST `List-Unsubscribe=One-Click` to the List-Unsubscribe URL with
 * the token in its query string and expect a plain 200.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get('List-Unsubscribe') === 'One-Click';
  const token = url.searchParams.get('token') ?? form?.get('token')?.toString();
  const id = verifyToken(token, 'unsubscribe');

  if (id) await deleteAlert(id).catch(() => null);

  if (oneClick) return new Response(null, { status: id ? 200 : 400 });
  // Unsubscribing something already gone is still "you will hear nothing more".
  return Response.redirect(new URL(`/alerts/result/${id ? 'unsubscribed' : 'invalid'}`, request.url), 303);
}
