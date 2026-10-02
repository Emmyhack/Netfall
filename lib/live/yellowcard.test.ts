import { afterEach, describe, expect, it } from 'vitest';
import { parseRate, signYellowCard, yellowCardQuote } from './connectors/yellowcard';
import { isLive } from './configured';
import { getCorridor } from '../corridors';

/** Vectors computed independently with openssl, not with the code under test. */
describe('Yellow Card request signing', () => {
  it('signs timestamp + path + METHOD for a GET, base64 HMAC-SHA256', () => {
    expect(
      signYellowCard('test-secret', '2022-01-11T15:48:37.424Z', '/business/rates', 'get'),
    ).toBe('sbG6VbKw8B9CxRufzkvZz1KhBOkdE4hZ7aIbM3g8Le8=');
  });

  it('appends the base64 SHA-256 of the body for a POST', () => {
    expect(
      signYellowCard(
        'test-secret',
        '2022-01-11T15:48:37.424Z',
        '/business/payment',
        'POST',
        '{"amount":100}',
      ),
    ).toBe('9didkTupwMrfAHbYsWGjMv8UhPi3aGwu3ijOdYSNIj8=');
  });
});

describe('Yellow Card rate parsing', () => {
  // The documented example response, verbatim.
  const documented = {
    rates: [
      { buy: 1600, sell: 1550, locale: 'NG', rateId: 'NGN-USD', code: 'NGN', updatedAt: 1707818937000 },
    ],
  };

  it('reads the buy side as the on-ramp price', () => {
    expect(parseRate(documented, 'NGN')).toEqual({ buy: '1600', updatedAt: 1707818937000 });
  });

  it('refuses a corridor the payload does not carry', () => {
    expect(() => parseRate(documented, 'KES')).toThrow(/no buy rate/);
  });

  it('refuses a malformed payload instead of guessing', () => {
    expect(() => parseRate({ data: [] }, 'NGN')).toThrow(/no rates array/);
  });
});

describe('Yellow Card without credentials', () => {
  const saved = { key: process.env.YELLOWCARD_API_KEY, secret: process.env.YELLOWCARD_SECRET_KEY };
  const restore = (name: string, value: string | undefined) => {
    // Assigning undefined to process.env stores the string "undefined".
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  afterEach(() => {
    restore('YELLOWCARD_API_KEY', saved.key);
    restore('YELLOWCARD_SECRET_KEY', saved.secret);
  });

  it('is not_configured and never advertised as live', async () => {
    delete process.env.YELLOWCARD_API_KEY;
    delete process.env.YELLOWCARD_SECRET_KEY;
    const result = await yellowCardQuote(getCorridor('ngn-usdt')!, '500000');
    expect(result).toEqual({ kind: 'unavailable', reason: 'not_configured' });
    expect(isLive('yellowcard')).toBe(false);
    expect(isLive('quidax')).toBe(true);
    expect(isLive('busha')).toBe(false);
  });

  it('counts as live once both keys are present', () => {
    process.env.YELLOWCARD_API_KEY = 'k';
    process.env.YELLOWCARD_SECRET_KEY = 's';
    expect(isLive('yellowcard')).toBe(true);
  });
});
