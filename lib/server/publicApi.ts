import { CORRIDORS, getCorridor } from '../corridors';
import { compare, isValidDecimalString } from '../money';
import type { CorridorMeta } from '../types';

/** Headers every public, read-only API response carries. */
export const PUBLIC_API_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
} as const;

export type ApiError = { status: number; error: string; message: string };

/** Accepts ngn-usdt or NGN-USDT; the site's slugs and the response's ids both work. */
export function corridorFromParam(value: string | null): CorridorMeta | ApiError {
  const corridor = value ? getCorridor(value.toLowerCase()) : null;
  if (corridor) return corridor;
  return {
    status: 400,
    error: 'corridor_unsupported',
    message: `corridor must be one of ${CORRIDORS.map((c) => c.slug).join(', ')}.`,
  };
}

/**
 * The public board covers the same range the site does: from the corridor
 * minimum up to its large-amount threshold. Above that, public prices stop
 * describing what an order would actually get, so the API says so instead
 * of returning figures that would mislead.
 */
export function amountFromParam(value: string | null, corridor: CorridorMeta): string | ApiError {
  if (!value || !isValidDecimalString(value)) {
    return { status: 400, error: 'amount_invalid', message: 'amount must be a positive decimal string, e.g. 500000.' };
  }
  if (compare(value, corridor.minAmount) < 0) {
    return {
      status: 400,
      error: 'below_minimum',
      message: `The minimum for ${corridor.id} is ${corridor.minAmount} ${corridor.from}.`,
    };
  }
  if (compare(value, corridor.otcThreshold) > 0) {
    return {
      status: 400,
      error: 'above_public_range',
      message: `Above ${corridor.otcThreshold} ${corridor.from}, ${corridor.id} is priced by negotiation, not from public order books.`,
    };
  }
  return value;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'error' in value && 'status' in value;
}

export function apiError(error: ApiError, extra: Record<string, string> = {}): Response {
  return Response.json(
    { error: error.error, message: error.message },
    { status: error.status, headers: { ...PUBLIC_API_HEADERS, ...extra } },
  );
}
