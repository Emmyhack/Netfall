import { requestJsonRaw } from '../live/http';

/**
 * Transactional email through Resend's REST API (no SDK). Configured by
 * RESEND_API_KEY and EMAIL_FROM, e.g. "Netfall <alerts@your-domain.com>" on
 * a domain verified in Resend. Nothing here retries: a failed send is
 * reported to the caller, which decides what the user is told.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  /** RFC 8058 one-click unsubscribe target, for messages that need one. */
  unsubscribeUrl?: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!emailConfigured()) throw new Error('email: not configured');
  const headers: Record<string, string> = {};
  if (email.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${email.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  // RESEND_API_URL exists for end-to-end testing against a local stand-in.
  const base = (process.env.RESEND_API_URL ?? 'https://api.resend.com').replace(/\/$/, '');
  await requestJsonRaw(`${base}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: {
      from: process.env.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    },
    timeoutMs: 10_000,
  });
}

/** Minimal escaping for values interpolated into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** One plain, readable layout for every message: a paragraph list and one link. */
export function layout(paragraphs: string[], action?: { label: string; url: string }, footer?: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#151515;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none">${escapeHtml(action.label)}</a></p>`
    : '';
  const foot = footer ? `<p style="margin:32px 0 0;font-size:13px;color:#65657e">${footer}</p>` : '';
  return `<!doctype html><html><body style="margin:0;padding:32px 20px;background:#efeef3"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.55;color:#151515">${body}${button}${foot}</div></body></html>`;
}
