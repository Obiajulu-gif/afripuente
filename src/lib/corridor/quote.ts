import Decimal from 'decimal.js';
import {
  assetAmountToFiatMinor,
  feeFromBps,
  fiatMinorToAssetAmount,
  fromMinorUnits,
  toMinorUnits,
} from '@/lib/money';

// Quote construction for the NGN -> BOB corridor.
//
// The corridor has two legs with very different epistemic status:
//
//   NGN -> USDC   No provider quote exists (Pollar has no Nigerian corridor).
//                 The rate is operator-set and INDICATIVE. Never "guaranteed".
//   USDC -> BOB   Pollar returns a real provider quote with a quoteId.
//                 Only this leg can ever be "guaranteed".
//
// A quote is therefore guaranteed only when a provider quote backs the payout
// leg, and even then the total NGN payable remains an estimate because the
// funding leg is indicative. The UI must say so.

/** A real Pollar ramp quote. Field names mirror the verified OpenAPI contract. */
export interface ProviderQuote {
  quoteId: string;
  provider: string;
  fee: number;
  feeCurrency: string;
  rate: number;
  rail: string;
  protocol: 'SEP-24' | 'REST';
  estimatedTime: string;
  recommended?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export interface CorridorConfig {
  /** Indicative NGN per 1 USDC on the funding leg. */
  ngnPerUsd: string;
  /** AfriPuente's NGN-side charge, basis points. */
  ngnFundingFeeBps: number;
  /** Indicative BOB per 1 USDC, used only when no provider quote exists. */
  bobPerUsdIndicative: string;
}

export type RateSource = 'provider' | 'indicative';

export interface QuoteBreakdown {
  sendAmountMinor: bigint;
  sendCurrency: 'NGN';
  fundingFeeMinor: bigint;
  netFundingMinor: bigint;

  settlementAmount: string;
  settlementAsset: 'USDC';
  ngnToAssetRate: string;

  payoutRate: string;
  payoutFeeMinor: bigint;
  networkFeeMinor: bigint;
  payoutAmountMinor: bigint;
  payoutCurrency: 'BOB';

  guaranteed: boolean;
  payoutRateSource: RateSource;
  fundingRateSource: 'indicative';

  providerQuoteId?: string;
  provider?: string;
  providerRail?: string;

  expiresAt: Date;
  /** Conditions a human needs to see. Non-empty means do not auto-proceed. */
  warnings: string[];
}

/** Pollar states a ramp quoteId is valid for 15 minutes. */
export const PROVIDER_QUOTE_TTL_MS = 15 * 60 * 1000;
/** Our own indicative quotes expire sooner, since nothing backs them. */
export const INDICATIVE_QUOTE_TTL_MS = 10 * 60 * 1000;

/**
 * Plausibility band for BOB per 1 USD. Bolivia's official rate sits near 6.96.
 * A provider rate outside this band is not silently accepted or "corrected" —
 * it raises a warning so a human decides. Guessing that a rate is inverted and
 * flipping it would be exactly the kind of invention this project must avoid.
 */
const BOB_PER_USD_MIN = new Decimal('1');
const BOB_PER_USD_MAX = new Decimal('40');

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'QuoteError';
  }
}

export function buildQuote(params: {
  sendAmountNgn: string;
  config: CorridorConfig;
  providerQuote?: ProviderQuote;
  now?: Date;
}): QuoteBreakdown {
  const { sendAmountNgn, config, providerQuote } = params;
  const now = params.now ?? new Date();
  const warnings: string[] = [];

  const sendAmountMinor = toMinorUnits(sendAmountNgn, 'NGN');
  if (sendAmountMinor <= 0n) {
    throw new QuoteError('Amount must be greater than zero.', 'AMOUNT_NOT_POSITIVE');
  }

  // Leg 1 — NGN funding. Fee is taken in NGN, then the remainder buys USDC.
  const fundingFeeMinor = feeFromBps(sendAmountMinor, config.ngnFundingFeeBps);
  const netFundingMinor = sendAmountMinor - fundingFeeMinor;
  if (netFundingMinor <= 0n) {
    throw new QuoteError('Fees exceed the amount sent.', 'FEE_EXCEEDS_AMOUNT');
  }

  const settlementAmount = fiatMinorToAssetAmount(netFundingMinor, 'NGN', config.ngnPerUsd);
  if (new Decimal(settlementAmount).lte(0)) {
    throw new QuoteError('Amount is too small to settle on Stellar.', 'AMOUNT_BELOW_DUST');
  }

  // Leg 2 — USDC -> BOB payout.
  const payoutRateSource: RateSource = providerQuote ? 'provider' : 'indicative';
  const payoutRate = providerQuote
    ? new Decimal(providerQuote.rate).toString()
    : config.bobPerUsdIndicative;

  const rate = new Decimal(payoutRate);
  if (rate.lte(0)) {
    throw new QuoteError('Payout rate must be positive.', 'RATE_NOT_POSITIVE');
  }
  if (rate.lt(BOB_PER_USD_MIN) || rate.gt(BOB_PER_USD_MAX)) {
    warnings.push(
      `Payout rate ${payoutRate} BOB per USDC is outside the expected range ` +
        `${BOB_PER_USD_MIN}-${BOB_PER_USD_MAX}. This quote needs manual review before use.`,
    );
  }

  // The provider fee may be denominated in either the settlement asset or BOB.
  // Both are handled explicitly; an unrecognised currency is an error, not a guess.
  let assetAfterFee = new Decimal(settlementAmount);
  let payoutFeeMinor = 0n;

  if (providerQuote && providerQuote.fee > 0) {
    const feeCurrency = providerQuote.feeCurrency.toUpperCase();
    if (feeCurrency === 'USDC' || feeCurrency === 'USD') {
      assetAfterFee = assetAfterFee.minus(new Decimal(providerQuote.fee));
      if (assetAfterFee.lte(0)) {
        throw new QuoteError('Provider fee exceeds the settlement amount.', 'FEE_EXCEEDS_AMOUNT');
      }
    } else if (feeCurrency === 'BOB') {
      payoutFeeMinor = toMinorUnits(new Decimal(providerQuote.fee).toFixed(2), 'BOB');
    } else {
      throw new QuoteError(
        `Unsupported provider fee currency "${providerQuote.feeCurrency}".`,
        'UNSUPPORTED_FEE_CURRENCY',
      );
    }
  }

  const grossPayoutMinor = assetAmountToFiatMinor(
    assetAfterFee.toFixed(7, Decimal.ROUND_DOWN),
    payoutRate,
    'BOB',
  );
  const payoutAmountMinor = grossPayoutMinor - payoutFeeMinor;
  if (payoutAmountMinor <= 0n) {
    throw new QuoteError('Fees exceed the amount receivable.', 'FEE_EXCEEDS_AMOUNT');
  }

  // Provider amount limits are expressed in the quote's own currency (BOB).
  if (providerQuote) {
    const payoutBob = new Decimal(fromMinorUnits(payoutAmountMinor, 'BOB'));
    if (providerQuote.minAmount !== undefined && payoutBob.lt(providerQuote.minAmount)) {
      throw new QuoteError(
        `Below the provider minimum of ${providerQuote.minAmount} BOB.`,
        'BELOW_PROVIDER_MINIMUM',
      );
    }
    if (providerQuote.maxAmount !== undefined && payoutBob.gt(providerQuote.maxAmount)) {
      throw new QuoteError(
        `Above the provider maximum of ${providerQuote.maxAmount} BOB.`,
        'ABOVE_PROVIDER_MAXIMUM',
      );
    }
  }

  const ttl = providerQuote ? PROVIDER_QUOTE_TTL_MS : INDICATIVE_QUOTE_TTL_MS;

  if (!providerQuote) {
    warnings.push(
      'No provider quote is attached. The amount received is an estimate only and is not guaranteed by any provider.',
    );
  }

  return {
    sendAmountMinor,
    sendCurrency: 'NGN',
    fundingFeeMinor,
    netFundingMinor,

    settlementAmount,
    settlementAsset: 'USDC',
    ngnToAssetRate: config.ngnPerUsd,

    payoutRate,
    payoutFeeMinor,
    // Pollar sponsors Stellar fees per the app's dashboard configuration, so the
    // sender is not charged a network fee here. Recorded explicitly as zero
    // rather than omitted, so the breakdown stays complete.
    networkFeeMinor: 0n,
    payoutAmountMinor,
    payoutCurrency: 'BOB',

    // Guaranteed requires a provider quote AND no outstanding warnings.
    guaranteed: Boolean(providerQuote) && warnings.length === 0,
    payoutRateSource,
    fundingRateSource: 'indicative',

    providerQuoteId: providerQuote?.quoteId,
    provider: providerQuote?.provider,
    providerRail: providerQuote?.rail,

    expiresAt: new Date(now.getTime() + ttl),
    warnings,
  };
}

export function isQuoteExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
