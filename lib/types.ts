/**
 * The production API contract. Mocks and components both import from here so
 * that replacing lib/quotes/source.ts with the live engine changes nothing else.
 *
 * Monetary values are decimal strings throughout. They are never parsed into a
 * JavaScript number — see lib/money.ts.
 */

export type Confidence = 'exact' | 'estimated' | 'insufficient_data';
export type QuoteSource = 'direct' | 'aggregator';

export interface FeeLine {
  label: string; // user-facing, plain language
  amount: string; // decimal string, negative for deductions
  currency: string;
}

export interface Quote {
  provider: string; // stable slug
  providerName: string; // display
  source: QuoteSource;
  landedAmount: string; // decimal string, never a JS number
  effectiveRate: string;
  feeBreakdown: FeeLine[];
  settlementEstimateSeconds: number;
  successRate30d: number; // 0..1
  paymentMethods: string[];
  confidence: Confidence;
  hasCommercialRelationship: boolean;
  routeUrl: string;
}

export type UnavailableReason =
  | 'below_minimum'
  | 'above_maximum'
  | 'timeout'
  | 'corridor_unsupported'
  | 'provider_down'
  | 'insufficient_data';

export interface UnavailableQuote {
  provider: string;
  providerName: string;
  reason: UnavailableReason;
}

export interface QuoteResponse {
  requestId: string;
  corridor: string; // "NGN-USDT"
  inputAmount: string;
  generatedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  dispersionBps: number;
  quotes: Quote[]; // pre-sorted by landedAmount desc
  unavailable: UnavailableQuote[];
}

/* -------------------------------------------------------------------------- */
/* Corridor definitions                                                        */
/* -------------------------------------------------------------------------- */

export type FiatCode = 'NGN' | 'GHS' | 'KES';
export type AssetCode = 'USDT' | 'USDC';

/** Canonical lowercase slug used in URLs, e.g. "ngn-usdt". */
export type CorridorSlug = string;

export interface CorridorMeta {
  slug: CorridorSlug; // "ngn-usdt"
  id: string; // "NGN-USDT"
  from: FiatCode;
  to: AssetCode;
  fromName: string; // "Nigerian naira"
  toName: string; // "Tether USD"
  countryName: string; // "Nigeria"
  /** Sensible starting amount for the corridor, decimal string. */
  defaultAmount: string;
  minAmount: string;
  maxAmount: string;
  /** Above this, the comparison hands over to the large-amount flow. */
  otcThreshold: string;
  /** Typical dispersion for the corridor, basis points. Copy + metadata only. */
  typicalDispersionBps: number;
  commonPaymentMethods: string[];
  /** Provider slugs that quote this corridor at all. */
  providers: string[];
}

/* -------------------------------------------------------------------------- */
/* Requests and client-side state                                              */
/* -------------------------------------------------------------------------- */

export interface QuoteRequest {
  corridor: CorridorSlug;
  amount: string; // decimal string
  /** Deterministic mock seeding. Ignored by the live engine. */
  seed?: string;
  /** Dev-only scenario override. Ignored by the live engine. */
  scenario?: ScenarioId;
  signal?: AbortSignal;
}

export type ScenarioId =
  | 'default'
  | 'all-fail'
  | 'all-timeout'
  | 'single-provider'
  | 'zero-dispersion'
  | 'extreme-dispersion'
  | 'expired';

/**
 * Providers stream in one at a time so rows can render progressively.
 * The terminal event carries the assembled response.
 */
export type QuoteEvent =
  | { type: 'started'; requestId: string; corridor: string; expected: number }
  | { type: 'quote'; quote: Quote }
  | { type: 'unavailable'; entry: UnavailableQuote }
  | { type: 'settled'; response: QuoteResponse }
  | { type: 'error'; error: QuoteError };

export type QuoteErrorCode =
  | 'corridor_unsupported'
  | 'amount_invalid'
  | 'amount_below_minimum'
  | 'amount_above_maximum'
  | 'all_providers_failed'
  | 'network';

export interface QuoteError {
  code: QuoteErrorCode;
  message: string;
  /** Nearest supported corridor, when we can suggest one. */
  suggestion?: CorridorSlug;
}

export interface ProviderProfile {
  slug: string;
  name: string;
  source: QuoteSource;
  hasCommercialRelationship: boolean;
  routeUrlTemplate: string;
}

/* -------------------------------------------------------------------------- */
/* Rate alerts (persisted locally in V1)                                       */
/* -------------------------------------------------------------------------- */

export type AlertTrigger =
  | { kind: 'target_rate'; targetRate: string }
  | { kind: 'best_provider_changes' };

export type AlertChannel = 'email' | 'whatsapp';

export interface RateAlert {
  id: string;
  corridor: CorridorSlug;
  trigger: AlertTrigger;
  channel: AlertChannel;
  destination: string;
  createdAt: string; // ISO 8601
}

/* -------------------------------------------------------------------------- */
/* Large-amount enquiries (persisted locally in V1)                            */
/* -------------------------------------------------------------------------- */

export interface LargeAmountEnquiry {
  id: string;
  corridor: CorridorSlug;
  amount: string;
  frequency: 'one_off' | 'weekly' | 'monthly' | 'ongoing';
  settlementWindow: 'same_day' | 'next_day' | 'flexible';
  entityType: 'individual' | 'business';
  contactChannel: AlertChannel;
  contactDestination: string;
  notes: string;
  createdAt: string; // ISO 8601
}
