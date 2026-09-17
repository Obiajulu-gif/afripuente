import { describe, expect, it } from 'vitest';
import { buildQuote, isQuoteExpired, QuoteError, type ProviderQuote } from '@/lib/corridor/quote';
import { fromMinorUnits } from '@/lib/money';

const config = {
  ngnPerUsd: '1650.00',
  ngnFundingFeeBps: 150,
  bobPerUsdIndicative: '6.96',
};

const providerQuote: ProviderQuote = {
  quoteId: 'pq_test_123',
  provider: 'stereum',
  fee: 0,
  feeCurrency: 'USDC',
  rate: 6.96,
  rail: 'ACH',
  protocol: 'SEP-24',
  estimatedTime: '1-2 business days',
};

describe('quote construction', () => {
  it('breaks down a 250,000 NGN send correctly', () => {
    const q = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote });

    expect(fromMinorUnits(q.sendAmountMinor, 'NGN')).toBe('250000.00');
    expect(fromMinorUnits(q.fundingFeeMinor, 'NGN')).toBe('3750.00'); // 150bps
    expect(fromMinorUnits(q.netFundingMinor, 'NGN')).toBe('246250.00');
    expect(q.settlementAmount).toBe('149.2424242');
    expect(q.payoutCurrency).toBe('BOB');
    expect(q.guaranteed).toBe(true);
  });

  it('marks a quote with no provider backing as NOT guaranteed and warns', () => {
    const q = buildQuote({ sendAmountNgn: '250000.00', config });

    expect(q.guaranteed).toBe(false);
    expect(q.payoutRateSource).toBe('indicative');
    expect(q.warnings.join(' ')).toMatch(/estimate only/i);
    expect(q.providerQuoteId).toBeUndefined();
  });

  it('always reports the funding leg as indicative, even with a provider quote', () => {
    // Pollar has no Nigerian corridor, so the NGN rate can never be guaranteed.
    const q = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote });
    expect(q.fundingRateSource).toBe('indicative');
  });

  it('refuses to guarantee a quote whose rate is outside the plausible band', () => {
    const inverted: ProviderQuote = { ...providerQuote, rate: 0.1437 }; // USDC per BOB
    const q = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote: inverted });

    expect(q.guaranteed).toBe(false);
    expect(q.warnings.join(' ')).toMatch(/outside the expected range/i);
    // It must NOT silently invert the rate.
    expect(q.payoutRate).toBe('0.1437');
  });

  it('subtracts a provider fee denominated in the settlement asset', () => {
    const withFee: ProviderQuote = { ...providerQuote, fee: 1.5, feeCurrency: 'USDC' };
    const base = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote });
    const feed = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote: withFee });

    expect(feed.payoutAmountMinor).toBeLessThan(base.payoutAmountMinor);
  });

  it('subtracts a provider fee denominated in BOB', () => {
    const withFee: ProviderQuote = { ...providerQuote, fee: 10, feeCurrency: 'BOB' };
    const q = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote: withFee });

    expect(fromMinorUnits(q.payoutFeeMinor, 'BOB')).toBe('10.00');
  });

  it('rejects an unrecognised fee currency instead of guessing', () => {
    const bad: ProviderQuote = { ...providerQuote, fee: 5, feeCurrency: 'EUR' };
    expect(() => buildQuote({ sendAmountNgn: '250000.00', config, providerQuote: bad })).toThrow(
      QuoteError,
    );
  });

  it('rejects a zero or negative amount', () => {
    expect(() => buildQuote({ sendAmountNgn: '0', config })).toThrow(/greater than zero/);
    expect(() => buildQuote({ sendAmountNgn: '-5', config })).toThrow();
  });

  it('enforces provider minimum and maximum limits', () => {
    const limited: ProviderQuote = { ...providerQuote, minAmount: 5000, maxAmount: 10000 };
    expect(() =>
      buildQuote({ sendAmountNgn: '250000.00', config, providerQuote: limited }),
    ).toThrow(/Below the provider minimum/);
  });

  it('gives a provider-backed quote a 15 minute life and an indicative one 10', () => {
    const now = new Date('2026-09-17T12:00:00Z');
    const backed = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote, now });
    const indicative = buildQuote({ sendAmountNgn: '250000.00', config, now });

    expect(backed.expiresAt.toISOString()).toBe('2026-09-17T12:15:00.000Z');
    expect(indicative.expiresAt.toISOString()).toBe('2026-09-17T12:10:00.000Z');
  });

  it('never quotes more BOB than the rate supports (rounds down)', () => {
    const q = buildQuote({ sendAmountNgn: '250000.00', config, providerQuote });
    // 149.2424242 * 6.96 = 1038.727272432 -> must be 1038.72, never 1038.73
    expect(fromMinorUnits(q.payoutAmountMinor, 'BOB')).toBe('1038.72');
  });
});

describe('quote expiry', () => {
  it('detects an expired quote', () => {
    const now = new Date('2026-09-17T12:00:00Z');
    expect(isQuoteExpired(new Date('2026-09-17T11:59:59Z'), now)).toBe(true);
    expect(isQuoteExpired(new Date('2026-09-17T12:00:01Z'), now)).toBe(false);
  });

  it('treats the exact expiry instant as expired', () => {
    const at = new Date('2026-09-17T12:00:00Z');
    expect(isQuoteExpired(at, at)).toBe(true);
  });
});
