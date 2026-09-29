'use client';

import type { LargeAmountEnquiry, RateAlert } from './types';

/**
 * V1 persistence: the browser, and nowhere else.
 *
 * LIVE: rate alerts post to /v1/alerts and large-amount enquiries post to
 * /v1/enquiries, both of which need a backend, an email or WhatsApp sender and
 * a consent record. Until then nothing leaves the device, and the forms say so.
 */

const ALERTS_KEY = 'netfall:alerts';
const ENQUIRIES_KEY = 'netfall:enquiries';

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function listAlerts(): RateAlert[] {
  return read<RateAlert>(ALERTS_KEY);
}

export function saveAlert(alert: RateAlert): boolean {
  return write(ALERTS_KEY, [alert, ...listAlerts()]);
}

export function deleteAlert(id: string): boolean {
  return write(
    ALERTS_KEY,
    listAlerts().filter((alert) => alert.id !== id),
  );
}

export function listEnquiries(): LargeAmountEnquiry[] {
  return read<LargeAmountEnquiry>(ENQUIRIES_KEY);
}

export function saveEnquiry(enquiry: LargeAmountEnquiry): boolean {
  return write(ENQUIRIES_KEY, [enquiry, ...listEnquiries()]);
}
