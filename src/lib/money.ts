import Decimal from 'decimal.js';

// Money is never a float. Fiat is carried as integer minor units with an
// explicit precision; the Stellar asset amount is carried as an exact decimal
// string, because Stellar classic assets are 7dp and the Pollar SDK's Stellar
// payment takes a decimal string rather than base units.
//
// Decimal.js is configured once, globally, so no call site can widen precision
// by accident.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -30, toExpPos: 40 });

export const STELLAR_DECIMALS = 7;

export const CURRENCY_PRECISION: Record<string, number> = {
  NGN: 2,
  BOB: 2,
  USD: 2,
  USDC: 7, // on Stellar
};

export function precisionOf(currency: string): number {
  const p = CURRENCY_PRECISION[currency.toUpperCase()];
  if (p === undefined) throw new Error(`Unknown currency precision: ${currency}`);
  return p;
}

/** Parse a user-entered decimal string into integer minor units. */
export function toMinorUnits(amount: string | number, currency: string): bigint {
  const precision = precisionOf(currency);
  const d = new Decimal(amount);
  if (!d.isFinite()) throw new Error(`Non-finite amount: ${amount}`);
  if (d.isNegative()) throw new Error(`Negative amount: ${amount}`);
  if (d.decimalPlaces() > precision) {
    throw new Error(`${currency} allows at most ${precision} decimal places, got "${amount}"`);
  }
  return BigInt(d.mul(new Decimal(10).pow(precision)).toFixed(0));
}

/** Render integer minor units as an exact decimal string. */
export function fromMinorUnits(minor: bigint, currency: string): string {
  const precision = precisionOf(currency);
  return new Decimal(minor.toString()).div(new Decimal(10).pow(precision)).toFixed(precision);
}

/** Localised display string, e.g. "₦250,000.00". Display only — never for math. */
export function formatMoney(minor: bigint, currency: string): string {
  const value = fromMinorUnits(minor, currency);
  const [whole, frac] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = currency === 'NGN' ? '₦' : currency === 'BOB' ? 'Bs ' : '';
  return `${symbol}${grouped}${frac ? `.${frac}` : ''}${symbol ? '' : ` ${currency}`}`;
}

/**
 * Apply a basis-point fee, rounding HALF_UP to the currency's precision.
 * Returns minor units, so the fee is exact and auditable.
 */
export function feeFromBps(baseMinor: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0) throw new Error(`Invalid bps: ${bps}`);
  const fee = new Decimal(baseMinor.toString()).mul(bps).div(10_000);
  return BigInt(fee.toFixed(0, Decimal.ROUND_HALF_UP));
}

/**
 * Convert fiat minor units to a Stellar asset amount, as an exact 7dp string.
 * Rounds DOWN so we never promise more asset than the rate supports.
 */
export function fiatMinorToAssetAmount(
  fiatMinor: bigint,
  fiatCurrency: string,
  fiatPerAssetUnit: string,
): string {
  const rate = new Decimal(fiatPerAssetUnit);
  if (rate.lte(0)) throw new Error(`Rate must be positive, got ${fiatPerAssetUnit}`);
  const fiat = new Decimal(fromMinorUnits(fiatMinor, fiatCurrency));
  return fiat.div(rate).toFixed(STELLAR_DECIMALS, Decimal.ROUND_DOWN);
}

/**
 * Convert a Stellar asset amount to fiat minor units at a given rate.
 * Rounds DOWN so the quoted receive amount is never overstated.
 */
export function assetAmountToFiatMinor(
  assetAmount: string,
  fiatPerAssetUnit: string,
  fiatCurrency: string,
): bigint {
  const precision = precisionOf(fiatCurrency);
  const gross = new Decimal(assetAmount).mul(new Decimal(fiatPerAssetUnit));
  return BigInt(gross.mul(new Decimal(10).pow(precision)).toFixed(0, Decimal.ROUND_DOWN));
}

/** Exact equality for a Stellar amount string, tolerant of trailing-zero forms. */
export function assetAmountsEqual(a: string, b: string): boolean {
  return new Decimal(a).eq(new Decimal(b));
}

/** True when `observed` is at least `expected` — used to verify asset delivery. */
export function assetAmountAtLeast(observed: string, expected: string): boolean {
  return new Decimal(observed).gte(new Decimal(expected));
}

export function normalizeAssetAmount(amount: string): string {
  return new Decimal(amount).toFixed(STELLAR_DECIMALS);
}
