import { describe, expect, it } from 'vitest';
import {
  assetAmountAtLeast,
  assetAmountToFiatMinor,
  assetAmountsEqual,
  feeFromBps,
  fiatMinorToAssetAmount,
  formatMoney,
  fromMinorUnits,
  toMinorUnits,
} from '@/lib/money';

// These are mock-free unit tests over pure arithmetic.

describe('minor-unit conversion', () => {
  it('round-trips NGN through minor units exactly', () => {
    expect(toMinorUnits('250000.00', 'NGN')).toBe(25_000_000n);
    expect(fromMinorUnits(25_000_000n, 'NGN')).toBe('250000.00');
  });

  it('rejects more decimal places than the currency allows', () => {
    expect(() => toMinorUnits('100.123', 'NGN')).toThrow(/at most 2 decimal places/);
    expect(() => toMinorUnits('100.123', 'BOB')).toThrow(/at most 2 decimal places/);
  });

  it('rejects negative and non-finite amounts', () => {
    expect(() => toMinorUnits('-1', 'NGN')).toThrow(/Negative/);
    expect(() => toMinorUnits('abc', 'NGN')).toThrow();
  });

  it('does not lose precision on values that break float arithmetic', () => {
    // 0.1 + 0.2 !== 0.3 in float; minor units make this exact.
    const a = toMinorUnits('0.10', 'NGN');
    const b = toMinorUnits('0.20', 'NGN');
    expect(fromMinorUnits(a + b, 'NGN')).toBe('0.30');
  });

  it('handles amounts far beyond float integer safety', () => {
    const huge = '99999999999999.99';
    expect(fromMinorUnits(toMinorUnits(huge, 'NGN'), 'NGN')).toBe(huge);
  });

  it('rejects unknown currencies rather than guessing precision', () => {
    expect(() => toMinorUnits('1.00', 'ZZZ')).toThrow(/Unknown currency precision/);
  });
});

describe('fee calculation', () => {
  it('applies basis points with half-up rounding', () => {
    // 150 bps of 250,000.00 NGN = 3,750.00
    expect(feeFromBps(25_000_000n, 150)).toBe(375_000n);
  });

  it('rounds a half-minor-unit up', () => {
    // 1 bps of 0.05 NGN = 0.000005 -> rounds to 0 minor units... use a case
    // that lands exactly on .5 of a minor unit: 50 bps of 1.01 NGN = 0.00505
    expect(feeFromBps(101n, 50)).toBe(1n); // 0.505 minor units -> 1
  });

  it('returns zero for a zero rate', () => {
    expect(feeFromBps(25_000_000n, 0)).toBe(0n);
  });

  it('rejects an invalid bps value', () => {
    expect(() => feeFromBps(100n, -1)).toThrow(/Invalid bps/);
    expect(() => feeFromBps(100n, 1.5)).toThrow(/Invalid bps/);
  });
});

describe('fiat <-> Stellar asset conversion', () => {
  it('converts NGN to a 7dp asset amount, rounding DOWN', () => {
    // 246,250.00 NGN / 1650.00 = 149.2424242...
    const amount = fiatMinorToAssetAmount(24_625_000n, 'NGN', '1650.00');
    expect(amount).toBe('149.2424242');
  });

  it('never rounds the asset amount up', () => {
    // 100 NGN / 3 = 33.333... must not become 33.3333334
    const amount = fiatMinorToAssetAmount(10_000n, 'NGN', '3');
    expect(amount).toBe('33.3333333');
  });

  it('converts an asset amount to BOB minor units, rounding DOWN', () => {
    // 149.2424242 USDC * 6.96 = 1038.72727... BOB -> 1038.72
    expect(assetAmountToFiatMinor('149.2424242', '6.96', 'BOB')).toBe(103_872n);
  });

  it('rejects a non-positive rate', () => {
    expect(() => fiatMinorToAssetAmount(100n, 'NGN', '0')).toThrow(/must be positive/);
  });
});

describe('asset amount comparison', () => {
  it('treats trailing-zero forms as equal', () => {
    expect(assetAmountsEqual('10', '10.0000000')).toBe(true);
  });

  it('accepts an over-delivery but rejects an under-delivery', () => {
    expect(assetAmountAtLeast('10.0000001', '10')).toBe(true);
    expect(assetAmountAtLeast('9.9999999', '10')).toBe(false);
  });
});

describe('display formatting', () => {
  it('groups thousands and keeps the currency symbol', () => {
    expect(formatMoney(25_000_000n, 'NGN')).toBe('₦250,000.00');
    expect(formatMoney(103_872n, 'BOB')).toBe('Bs 1,038.72');
  });
});
