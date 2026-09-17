'use client';

import type { PollarClient } from '@pollar/core';

// APPLICATION-OWNED wrappers around REAL Pollar SDK methods.
//
// Naming discipline for this file: every function here is AfriPuente's, and each
// one names the actual Pollar method it calls. Nothing here is a Pollar API.
// The real methods used are:
//
//   client.getRampsQuote(query)        -> GET  /v2/ramps/quote
//   client.getRampCountries()          -> GET  /v2/ramps/countries
//   client.createOffRamp(body)         -> POST /v2/ramps/offramp
//   client.getRampTransaction(txId)    -> GET  /v2/ramps/transaction/{txId}
//   client.submitRampSignature(txId,b) -> POST /v2/ramps/transaction/{txId}/signature
//
// These require an authenticated user session: the publishable key alone
// returns 401 SDK_AUTH_INVALID_TOKEN (see docs/pollar-integration.md).

export const BOLIVIA = { country: 'BO', currency: 'BOB' } as const;

export interface RampQuoteView {
  quoteId: string;
  provider: string;
  fee: number;
  feeCurrency: string;
  rate: number;
  rail: string;
  protocol: 'SEP-24' | 'REST';
  estimatedTime: string;
  recommended: boolean;
  requiredFields: RequiredField[];
  minAmount?: number;
  maxAmount?: number;
}

export interface RequiredField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select';
  bankType?: string;
  options?: { value: string; label: string; placeholder?: string }[];
  optional?: boolean;
  placeholder?: string;
  hint?: string;
}

export type RampOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function describeError(err: unknown): { code: string; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('SDK_AUTH_INVALID_TOKEN') || message.includes('401')) {
    return {
      code: 'NEEDS_POLLAR_SESSION',
      message:
        'Pollar needs an authenticated session before it will return a Bolivian quote. Sign in first.',
    };
  }
  if (message.includes('ORIGIN_NOT_ALLOWED')) {
    return {
      code: 'ORIGIN_NOT_ALLOWED',
      message:
        'This origin is not registered in the Pollar dashboard (Build → Domains). Ramp calls are blocked until it is.',
    };
  }
  return { code: 'RAMP_ERROR', message };
}

/**
 * AfriPuente wrapper: fetch Bolivian off-ramp quotes for a BOB payout amount.
 * Calls the real `client.getRampsQuote`.
 */
export async function fetchBoliviaOfframpQuotes(
  client: PollarClient,
  payoutAmountBob: number,
): Promise<RampOutcome<RampQuoteView[]>> {
  try {
    const res = await client.getRampsQuote({
      country: BOLIVIA.country,
      currency: BOLIVIA.currency,
      amount: payoutAmountBob,
      direction: 'offramp',
    });
    const quotes = (res?.quotes ?? []) as unknown as RampQuoteView[];
    return { ok: true, data: quotes };
  } catch (err) {
    const { code, message } = describeError(err);
    return { ok: false, code, message };
  }
}

/**
 * AfriPuente wrapper: confirm Bolivia is actually offered by this app's enabled
 * anchors, rather than assuming it from documentation.
 * Calls the real `client.getRampCountries`.
 */
export async function fetchSupportedCountries(
  client: PollarClient,
): Promise<RampOutcome<{ code: string; currency: string | null }[]>> {
  try {
    const res = await client.getRampCountries();
    return { ok: true, data: (res?.countries ?? []) as { code: string; currency: string | null }[] };
  } catch (err) {
    const { code, message } = describeError(err);
    return { ok: false, code, message };
  }
}
