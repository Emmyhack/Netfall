import type { CorridorSlug } from './types';

/**
 * Editorial copy and payment methods per corridor, kept out of
 * lib/corridors.ts so it never travels in the client bundle: only the
 * server-rendered corridor pages use it.
 *
 * Every sentence here is structural — how payment works and what the
 * figures do and do not include — not a market claim. Anything measurable
 * (spread, coverage, history) is measured and shown beside this copy.
 */
export const CORRIDOR_NOTES: Readonly<Record<CorridorSlug, string>> = {
  'ngn-usdt':
    'Naira purchases are mostly funded by bank transfer. Each venue prices from its own order book or peer-to-peer market rather than from one official rate, which is why the same naira buys noticeably different amounts of USDT from one provider to the next.',
  'ngn-usdc':
    'Fewer naira venues quote USDC than USDT. Where a venue has no direct naira market for USDC, the price is reached through USDT, and that extra conversion is part of what you pay.',
  'ghs-usdt':
    'Most purchases in Ghana are funded with mobile money. The mobile money operator can charge its own transfer fee on top of the provider’s price; the figures here are the provider’s price only.',
  'ghs-usdc':
    'Fewer providers quote USDC against the cedi than USDT. Where USDC is not quoted directly, it is reached through USDT. Mobile money transfer fees, where they apply, are not included in the figures here.',
  'kes-usdt':
    'M-Pesa is the usual way to pay. M-Pesa’s own transaction charges apply on top of the provider’s price and are not included in the figures here.',
  'kes-usdc':
    'Fewer providers quote USDC against the shilling than USDT. As with USDT, M-Pesa transaction charges are separate from the provider’s price and are not included here.',
};

/** How people in each corridor commonly pay in. Server-rendered copy only. */
export const CORRIDOR_PAYMENT_METHODS: Readonly<Record<CorridorSlug, readonly string[]>> = {
  'ngn-usdt': ['Bank transfer', 'Card', 'USSD', 'Opay', 'PalmPay'],
  'ngn-usdc': ['Bank transfer', 'Card', 'USSD'],
  'ghs-usdt': ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Bank transfer'],
  'ghs-usdc': ['MTN MoMo', 'Telecel Cash', 'Bank transfer'],
  'kes-usdt': ['M-Pesa', 'Bank transfer', 'Airtel Money'],
  'kes-usdc': ['M-Pesa', 'Bank transfer'],
};

export function paymentMethodsFor(slug: string): readonly string[] {
  return CORRIDOR_PAYMENT_METHODS[slug] ?? [];
}

export function corridorNote(slug: string): string {
  return CORRIDOR_NOTES[slug] ?? '';
}
