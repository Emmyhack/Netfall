import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, expiring tokens for links in emails (confirm, unsubscribe). Nothing
 * is stored: the token carries the alert id, the action and an expiry, and an
 * HMAC over them with ALERTS_TOKEN_SECRET. Changing the secret invalidates
 * every outstanding link.
 */

export type TokenAction = 'confirm' | 'unsubscribe';

interface Claims {
  a: TokenAction;
  i: string;
  e: number; // expiry, epoch seconds
}

function secret(): string {
  const value = process.env.ALERTS_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error('tokens: ALERTS_TOKEN_SECRET must be at least 32 characters');
  return value;
}

export function tokensConfigured(): boolean {
  return (process.env.ALERTS_TOKEN_SECRET?.length ?? 0) >= 32;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueToken(action: TokenAction, id: string, ttlSeconds: number): string {
  const claims: Claims = { a: action, i: id, e: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** The alert id the token authorises for `action`, or null if it is forged, expired or for another action. */
export function verifyToken(token: string | null | undefined, action: TokenAction): string | null {
  if (!token || !tokensConfigured()) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims;
    if (claims.a !== action || typeof claims.i !== 'string') return null;
    if (claims.e < Math.floor(Date.now() / 1000)) return null;
    return claims.i;
  } catch {
    return null;
  }
}
