import type { CorridorSlug } from './types';

/**
 * Editorial copy and payment methods per corridor, kept out of lib/corridors.ts so it never
 * travels in the client bundle: only the statically generated corridor page
 * renders it.
 *
 * LIVE: this becomes real editorial copy per corridor. The structure is what
 * matters for now.
 */
export const CORRIDOR_NOTES: Readonly<Record<CorridorSlug, string>> = {
  'ngn-usdt':
    'The deepest of the three corridors and the most dispersed. Naira liquidity moves between the official window and the parallel market, and providers price the difference very differently from one another.',
  'ngn-usdc':
    'Thinner than the USDT book in Nigeria. Fewer providers quote it, and the ones that do often widen the spread rather than raise the headline fee.',
  'ghs-usdt':
    'Almost entirely mobile money. Momo settlement fees are charged by the network as well as the provider, and only some providers show that cost before you commit.',
  'ghs-usdc':
    'A small book. Expect two or three providers to be unable to quote at any given moment, and expect the remaining spread to be wide.',
  'kes-usdt':
    'M-Pesa dominates, and its own tariff band applies on top of whatever the provider charges. The tightest of the three corridors, but the tariff makes small amounts disproportionately expensive.',
  'kes-usdc':
    'Growing, but still behind USDT on both depth and coverage. Settlement is usually fast; the cost sits in the rate rather than the fee.',
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
