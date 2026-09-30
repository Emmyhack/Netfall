import { describe, expect, it } from 'vitest';
import { decimalStringFrom, numberFrom } from './http';
import { grossAtReference } from './midmarket';
import { add, divide, multiply, reconcileBreakdown, round, subtract } from '../money';
import { LIVE_PROVIDERS, liveProvidersFor } from './registry';
import { integratedFor, providersFor } from './registry-core';
import ngnTicker from './fixtures/quidax-tk-ngn.json';
import ghsTicker from './fixtures/quidax-tk-ghs.json';
import usdcTicker from './fixtures/quidax-tk-usdc.json';

/**
 * The fixtures are real responses captured from Quidax's public API on
 * 2026-09-30 — actual naira and cedi order-book tops, not invented numbers.
 * The tests exercise the same arithmetic the connector runs on them.
 */

describe('upstream boundary parsing', () => {
  it('accepts the shapes real APIs send', () => {
    expect(decimalStringFrom('1371.47')).toBe('1371.47');
    expect(decimalStringFrom(1327.241555)).toBe('1327.241555');
    expect(decimalStringFrom(1.0005)).toBe('1.0005');
  });

  it('rejects junk rather than mis-parsing it', () => {
    expect(decimalStringFrom('')).toBeNull();
    expect(decimalStringFrom('abc')).toBeNull();
    expect(decimalStringFrom(-5)).toBeNull();
    expect(decimalStringFrom(0)).toBeNull();
    expect(decimalStringFrom(null)).toBeNull();
    expect(numberFrom('12.5')).toBe(12.5);
    expect(numberFrom('nope')).toBeNull();
  });

  it('normalises exponent forms into plain decimals', () => {
    const tiny = decimalStringFrom(1e-7);
    expect(tiny).not.toBeNull();
    expect(tiny).not.toContain('e');
  });
});

describe('the live ledger, on captured market data', () => {
  const sellNgn = ngnTicker.data.ticker.sell; // 1371.47 NGN per USDT, real
  const sellGhs = ghsTicker.data.ticker.sell; // 12.1 GHS per USDT, real
  const sellUsdcInUsdt = usdcTicker.data.ticker.sell; // 1.0005, real

  it('reconciles exactly for a naira purchase', () => {
    const amount = '500000';
    const referenceFiatPerAsset = '1327.241555'; // er-api NGN x CoinGecko USDT
    const landed = round(divide(amount, sellNgn, 8), 2);
    const gross = round(grossAtReference(amount, referenceFiatPerAsset), 2);
    const margin = subtract(landed, gross);

    const lines = [
      { amount: gross, currency: 'USDT' },
      { amount: margin, currency: 'USDT' },
    ];
    expect(reconcileBreakdown(lines, landed)).toEqual({ ok: true });
    // The venue price sits above the interbank reference, so the margin is a
    // deduction here — but the ledger would stay honest either way.
    expect(margin.startsWith('-')).toBe(true);
  });

  it('reconciles for the cedi market and the USDC cross', () => {
    const amount = '5000';
    const referenceFiatPerAsset = multiply('11.701151', '0.99984'); // GHS/USD x USDC/USD
    const viaUsdt = divide(amount, sellGhs, 8);
    const landed = round(divide(viaUsdt, sellUsdcInUsdt, 8), 2);
    const gross = round(grossAtReference(amount, referenceFiatPerAsset), 2);
    const margin = subtract(landed, gross);

    expect(reconcileBreakdown(
      [
        { amount: gross, currency: 'USDC' },
        { amount: margin, currency: 'USDC' },
      ],
      landed,
    )).toEqual({ ok: true });
    expect(add(gross, margin)).toBe(landed);
  });
});

describe('the registry states only checkable facts', () => {
  it('claims no commercial relationship anywhere, matching the disclosure pages', () => {
    expect(LIVE_PROVIDERS.every((p) => p.hasCommercialRelationship === false)).toBe(true);
  });

  it('carries no invented referral parameters in any URL', () => {
    for (const p of LIVE_PROVIDERS) {
      expect(p.routeUrlTemplate).not.toMatch(/ref=|referral|affiliate/i);
    }
  });

  it('maps every corridor to at least one tracked provider', () => {
    for (const slug of ['ngn-usdt', 'ngn-usdc', 'ghs-usdt', 'ghs-usdc', 'kes-usdt', 'kes-usdc']) {
      expect(providersFor(slug).length).toBeGreaterThan(0);
    }
  });

  it('integrated always implies a subset of tracked', () => {
    for (const slug of ['ngn-usdt', 'kes-usdt']) {
      const tracked = liveProvidersFor(slug).map((p) => p.slug);
      for (const p of integratedFor(slug)) expect(tracked).toContain(p.slug);
    }
  });
});
