import { emailConfigured } from './email';
import { redisConfigured } from './redis';
import { tokensConfigured } from './tokens';

/**
 * What this deployment can actually do. The same checks run at build time in
 * next.config.mjs to switch the forms on in the browser; these are the
 * server's authoritative versions, re-checked on every request.
 */
export function alertsReady(): boolean {
  return redisConfigured() && emailConfigured() && tokensConfigured();
}

export function enquiriesReady(): boolean {
  return redisConfigured() && emailConfigured() && Boolean(process.env.ENQUIRY_INBOX);
}

export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
