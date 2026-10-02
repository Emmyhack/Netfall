import { randomBytes } from 'node:crypto';
import { getCorridor } from '../corridors';
import { formatMoney } from '../format';
import { compare, isValidDecimalString } from '../money';
import type { LargeAmountEnquiry } from '../types';
import { escapeHtml, layout, sendEmail } from './email';
import { redis } from './redis';

/**
 * Large-amount enquiries go to a person: the inbox in ENQUIRY_INBOX, with
 * reply-to set to the enquirer when they gave an email. A copy is kept for
 * 180 days so nothing is lost if an email goes astray, then expires.
 */

const RETENTION_SECONDS = 180 * 24 * 3600;

const FREQUENCY = { one_off: 'once', weekly: 'weekly', monthly: 'monthly', ongoing: 'continuously' } as const;
const WINDOW = { same_day: 'same day', next_day: 'next working day', flexible: 'flexible' } as const;
const ENTITY = { individual: 'an individual', business: 'a business' } as const;

export type EnquiryInput = Omit<LargeAmountEnquiry, 'id' | 'createdAt'>;

export function validateEnquiry(input: unknown): { ok: true; value: EnquiryInput } | { ok: false; message: string } {
  const b = (input ?? {}) as Record<string, unknown>;
  const corridor = typeof b.corridor === 'string' ? getCorridor(b.corridor) : null;
  if (!corridor) return { ok: false, message: 'Choose a corridor we track.' };
  if (!isValidDecimalString(b.amount) || compare(b.amount, corridor.minAmount) < 0) {
    return { ok: false, message: 'Enter the amount you want to move.' };
  }
  if (!(typeof b.frequency === 'string' && b.frequency in FREQUENCY)) return { ok: false, message: 'Choose how often.' };
  if (!(typeof b.settlementWindow === 'string' && b.settlementWindow in WINDOW)) {
    return { ok: false, message: 'Choose a settlement window.' };
  }
  if (!(typeof b.entityType === 'string' && b.entityType in ENTITY)) return { ok: false, message: 'Choose who is sending.' };

  const channel = b.contactChannel;
  const destination = typeof b.contactDestination === 'string' ? b.contactDestination.trim() : '';
  if (channel === 'email') {
    if (destination.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
      return { ok: false, message: 'Enter a complete email address.' };
    }
  } else if (channel === 'whatsapp') {
    if (!/^\+?[\d\s-]{7,20}$/.test(destination)) {
      return { ok: false, message: 'Enter a number with its country code, for example +234 802 000 0000.' };
    }
  } else {
    return { ok: false, message: 'Choose how we should reach you.' };
  }

  const notes = typeof b.notes === 'string' ? b.notes.trim().slice(0, 2000) : '';
  return {
    ok: true,
    value: {
      corridor: corridor.slug,
      amount: b.amount,
      frequency: b.frequency as EnquiryInput['frequency'],
      settlementWindow: b.settlementWindow as EnquiryInput['settlementWindow'],
      entityType: b.entityType as EnquiryInput['entityType'],
      contactChannel: channel,
      contactDestination: destination,
      notes,
    },
  };
}

export async function submitEnquiry(input: EnquiryInput): Promise<{ id: string }> {
  const corridor = getCorridor(input.corridor)!;
  const enquiry: LargeAmountEnquiry = {
    ...input,
    id: `enq_${randomBytes(6).toString('base64url')}`,
    createdAt: new Date().toISOString(),
  };
  await redis(['SET', `enquiry:${enquiry.id}`, JSON.stringify(enquiry), 'EX', RETENTION_SECONDS]);

  const amount = formatMoney(enquiry.amount, corridor.from, { decimals: 0 });
  const lines = [
    `${amount} into ${corridor.to}, ${FREQUENCY[enquiry.frequency]}, settling ${WINDOW[enquiry.settlementWindow]}.`,
    `From ${ENTITY[enquiry.entityType]}. Reach them by ${enquiry.contactChannel === 'email' ? 'email' : 'WhatsApp'}: ${enquiry.contactDestination}.`,
    enquiry.notes ? `Notes: ${enquiry.notes}` : 'No notes.',
    `Reference ${enquiry.id}, received ${enquiry.createdAt}.`,
  ];

  await sendEmail({
    to: process.env.ENQUIRY_INBOX!,
    subject: `Large-amount enquiry: ${amount} → ${corridor.to}`,
    replyTo: enquiry.contactChannel === 'email' ? enquiry.contactDestination : undefined,
    text: lines.join('\n\n'),
    html: layout(lines.map(escapeHtml)),
  });

  // The acknowledgement is a courtesy; the enquiry already reached the inbox.
  if (enquiry.contactChannel === 'email') {
    const ack = [
      `We have your enquiry to move ${amount} into ${corridor.to}, ${FREQUENCY[enquiry.frequency]}.`,
      'A person at Netfall reads every one of these and will reply to this address. Netfall never holds funds or executes trades: if a desk can quote this size, you deal with them directly.',
      `Your reference is ${enquiry.id}.`,
    ];
    await sendEmail({
      to: enquiry.contactDestination,
      subject: 'We have your large-amount enquiry',
      text: ack.join('\n\n'),
      html: layout(ack.map(escapeHtml)),
    }).catch(() => undefined);
  }
  return { id: enquiry.id };
}
