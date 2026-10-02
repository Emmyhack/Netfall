import { randomBytes, createHash } from 'node:crypto';
import { getCorridor } from '../corridors';
import { formatMoney } from '../format';
import { compare, isValidDecimalString } from '../money';
import { SITE_URL } from '../site';
import type { AlertTrigger, CorridorMeta } from '../types';
import { escapeHtml, layout, sendEmail } from './email';
import { pipeline, redis } from './redis';
import { issueToken } from './tokens';
import type { CorridorSnapshot } from './snapshot';

/**
 * Rate alerts, stored in Redis and delivered by email.
 *
 * Lifecycle: pending (48h to confirm, then it expires on its own) → active →
 * deleted, either when a target-rate alert fires (one-shot: the email links
 * back to set another) or when the recipient unsubscribes. Nothing is kept
 * after that — an alert is an email address and a number, and neither is
 * worth holding once its job is done.
 */

export interface StoredAlert {
  id: string;
  corridor: string;
  trigger: AlertTrigger;
  email: string;
  status: 'pending' | 'active';
  createdAt: string;
  confirmedAt?: string;
  /** best_provider_changes: the provider we last told them about, or saw first. */
  lastBestProvider?: string;
  lastNotifiedAt?: string;
}

const PENDING_TTL_SECONDS = 48 * 3600;
const MAX_ALERTS_PER_EMAIL = 10;
/** Minimum gap between "cheapest provider changed" emails for one alert. */
const CHANGE_COOLDOWN_MS = 6 * 3600 * 1000;

const alertKey = (id: string) => `alert:${id}`;
const ACTIVE = 'alerts:active';
const byEmailKey = (email: string) =>
  `alerts:email:${createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 32)}`;

export type CreateResult =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

export function validateAlertInput(input: unknown):
  | { ok: true; corridor: CorridorMeta; trigger: AlertTrigger; email: string }
  | { ok: false; message: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const corridor = typeof body.corridor === 'string' ? getCorridor(body.corridor) : null;
  if (!corridor) return { ok: false, message: 'Choose a corridor we track.' };

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter a complete email address.' };
  }

  const trigger = body.trigger as Record<string, unknown> | undefined;
  if (trigger?.kind === 'best_provider_changes') {
    return { ok: true, corridor, trigger: { kind: 'best_provider_changes' }, email };
  }
  if (trigger?.kind === 'target_rate') {
    const rate = trigger.targetRate;
    if (!isValidDecimalString(rate) || compare(rate, '0') <= 0) {
      return { ok: false, message: `Enter the rate you want, in ${corridor.from} per ${corridor.to}.` };
    }
    return { ok: true, corridor, trigger: { kind: 'target_rate', targetRate: rate }, email };
  }
  return { ok: false, message: 'Choose what the alert should watch for.' };
}

export async function createAlert(input: {
  corridor: CorridorMeta;
  trigger: AlertTrigger;
  email: string;
}): Promise<CreateResult> {
  const emailSet = byEmailKey(input.email);
  const existing = await redis<string[]>(['SMEMBERS', emailSet]);
  // Prune ids whose pending alerts expired unconfirmed before counting.
  const alive = existing.length
    ? await pipeline<number[]>(existing.map((id) => ['EXISTS', alertKey(id)]))
    : [];
  const dead = existing.filter((_, i) => alive[i] === 0);
  if (dead.length) await redis(['SREM', emailSet, ...dead]);
  if (existing.length - dead.length >= MAX_ALERTS_PER_EMAIL) {
    return {
      ok: false,
      status: 429,
      error: 'too_many_alerts',
      message: `That address already has ${MAX_ALERTS_PER_EMAIL} alerts. Unsubscribe from one first.`,
    };
  }

  const alert: StoredAlert = {
    id: randomBytes(9).toString('base64url'),
    corridor: input.corridor.slug,
    trigger: input.trigger,
    email: input.email,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await pipeline([
    ['SET', alertKey(alert.id), JSON.stringify(alert), 'EX', PENDING_TTL_SECONDS],
    ['SADD', emailSet, alert.id],
  ]);

  const confirmUrl = `${SITE_URL}/alerts/confirm?token=${issueToken('confirm', alert.id, PENDING_TTL_SECONDS)}`;
  const what = describe(alert, input.corridor);
  try {
    await sendEmail({
      to: alert.email,
      subject: `Confirm your ${input.corridor.from} to ${input.corridor.to} rate alert`,
      text: `Confirm this Netfall alert: ${what}\n\n${confirmUrl}\n\nIf you did not ask for this, ignore this email and nothing will be sent again. The link expires in 48 hours.`,
      html: layout(
        [`Confirm this Netfall alert: <strong>${escapeHtml(what)}</strong>.`],
        { label: 'Confirm the alert', url: confirmUrl },
        'If you did not ask for this, ignore this email and nothing will be sent again. The link expires in 48 hours.',
      ),
    });
  } catch {
    await pipeline([['DEL', alertKey(alert.id)], ['SREM', emailSet, alert.id]]);
    return { ok: false, status: 502, error: 'email_failed', message: 'We could not send the confirmation email. Try again shortly.' };
  }
  return { ok: true };
}

async function load(id: string): Promise<StoredAlert | null> {
  const raw = await redis<string | null>(['GET', alertKey(id)]);
  return raw ? (JSON.parse(raw) as StoredAlert) : null;
}

export async function confirmAlert(id: string): Promise<'confirmed' | 'already' | 'missing'> {
  const alert = await load(id);
  if (!alert) return 'missing';
  if (alert.status === 'active') return 'already';
  const next: StoredAlert = { ...alert, status: 'active', confirmedAt: new Date().toISOString() };
  await pipeline([
    ['SET', alertKey(id), JSON.stringify(next)],
    ['SADD', ACTIVE, id],
  ]);
  return 'confirmed';
}

export async function deleteAlert(id: string): Promise<'deleted' | 'missing'> {
  const alert = await load(id);
  if (!alert) return 'missing';
  await pipeline([
    ['DEL', alertKey(id)],
    ['SREM', ACTIVE, id],
    ['SREM', byEmailKey(alert.email), id],
  ]);
  return 'deleted';
}

/** Fiat per one unit of the asset — the number the user typed as their target. */
function describe(alert: Pick<StoredAlert, 'trigger'>, corridor: CorridorMeta): string {
  return alert.trigger.kind === 'target_rate'
    ? `tell me when 1 ${corridor.to} costs ${formatMoney(alert.trigger.targetRate, corridor.from, { decimals: 2 })} or less on ${corridor.from} to ${corridor.to}`
    : `tell me when the cheapest provider for ${corridor.from} to ${corridor.to} changes`;
}

function unsubscribeToken(id: string): string {
  return issueToken('unsubscribe', id, 365 * 24 * 3600);
}

/** The page a person lands on from the email link: one button, no GET side effects. */
function unsubscribeUrl(id: string): string {
  return `${SITE_URL}/alerts/unsubscribe?token=${unsubscribeToken(id)}`;
}

/** RFC 8058 one-click target, POSTed to directly by mail clients. */
function oneClickUrl(id: string): string {
  return `${SITE_URL}/api/v1/alerts/unsubscribe?token=${unsubscribeToken(id)}`;
}

export interface EvaluationReport {
  checked: number;
  sent: number;
  failed: number;
}

/**
 * Runs every active alert against this tick's snapshots. A corridor with no
 * usable snapshot (nothing priced above insufficient_data) is skipped, never
 * guessed at.
 */
export async function evaluateAlerts(
  snapshots: ReadonlyMap<string, CorridorSnapshot>,
): Promise<EvaluationReport> {
  const ids = await redis<string[]>(['SMEMBERS', ACTIVE]);
  const report: EvaluationReport = { checked: 0, sent: 0, failed: 0 };

  for (const id of ids) {
    const alert = await load(id);
    if (!alert) {
      await redis(['SREM', ACTIVE, id]);
      continue;
    }
    const corridor = getCorridor(alert.corridor);
    const snap = snapshots.get(alert.corridor);
    if (!corridor || !snap) continue;
    report.checked += 1;

    try {
      if (alert.trigger.kind === 'target_rate') {
        if (compare(snap.fiatPerAsset, alert.trigger.targetRate) > 0) continue;
        await sendEmail({
          to: alert.email,
          subject: `${corridor.from} to ${corridor.to} hit your rate`,
          ...message(
            [
              `${snap.providerName} is offering 1 ${corridor.to} for ${formatMoney(snap.fiatPerAsset, corridor.from, { decimals: 2 })}, at or below your target of ${formatMoney(alert.trigger.targetRate, corridor.from, { decimals: 2 })}.`,
              `Measured on a ${formatMoney(snap.amount, corridor.from, { decimals: 0 })} transfer at ${snap.at.slice(11, 16)} UTC. Rates move constantly — check the live comparison before you send.`,
              'This alert has now done its job and has been deleted. Set another any time.',
            ],
            corridor,
          ),
        });
        await deleteAlert(id);
        report.sent += 1;
        continue;
      }

      // best_provider_changes
      if (!alert.lastBestProvider) {
        await redis(['SET', alertKey(id), JSON.stringify({ ...alert, lastBestProvider: snap.provider })]);
        continue;
      }
      if (alert.lastBestProvider === snap.provider) continue;
      const last = alert.lastNotifiedAt ? Date.parse(alert.lastNotifiedAt) : 0;
      if (Date.now() - last < CHANGE_COOLDOWN_MS) continue;

      await sendEmail({
        to: alert.email,
        subject: `${snap.providerName} is now cheapest for ${corridor.from} to ${corridor.to}`,
        unsubscribeUrl: oneClickUrl(id),
        ...message(
          [
            `${snap.providerName} now delivers the most for ${corridor.from} to ${corridor.to}: ${formatMoney(snap.landed, corridor.to)} on a ${formatMoney(snap.amount, corridor.from, { decimals: 0 })} transfer, measured at ${snap.at.slice(11, 16)} UTC.`,
            'We will tell you again if it changes, at most once every six hours.',
          ],
          corridor,
          unsubscribeUrl(id),
        ),
      });
      await redis([
        'SET',
        alertKey(id),
        JSON.stringify({ ...alert, lastBestProvider: snap.provider, lastNotifiedAt: new Date().toISOString() }),
      ]);
      report.sent += 1;
    } catch {
      report.failed += 1;
    }
  }
  return report;
}

function message(paragraphs: string[], corridor: CorridorMeta, unsubscribe?: string): { text: string; html: string } {
  const compareUrl = `${SITE_URL}/compare/${corridor.slug}`;
  const footer = unsubscribe
    ? `You asked Netfall for this alert. <a href="${escapeHtml(unsubscribe)}">Unsubscribe</a>.`
    : 'You asked Netfall for this alert.';
  return {
    text: `${paragraphs.join('\n\n')}\n\nCompare now: ${compareUrl}${unsubscribe ? `\n\nUnsubscribe: ${unsubscribe}` : ''}`,
    html: layout(paragraphs.map(escapeHtml), { label: 'See the live comparison', url: compareUrl }, footer),
  };
}
