import { z } from 'zod';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { ok, parseBody, serializeBigInt, toErrorResponse } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { buildQuote, type ProviderQuote } from '@/lib/corridor/quote';

// The client may pass a provider quote it obtained from Pollar, because ramp
// endpoints require the user's own browser session (they reject the secret key
// and need a DPoP-bound user token — see docs/pollar-integration.md).
//
// The server therefore treats the provider quote as EVIDENCE, not as an answer:
// it recomputes every total from the raw provider fields plus its own fee
// configuration, and stores the raw payload. No client-supplied total, fee or
// receive amount is ever persisted or trusted.
const providerQuoteSchema = z.object({
  quoteId: z.string().min(1),
  provider: z.string().min(1),
  fee: z.number().nonnegative(),
  feeCurrency: z.string().min(1),
  rate: z.number().positive(),
  rail: z.string().min(1),
  protocol: z.enum(['SEP-24', 'REST']),
  estimatedTime: z.string().default(''),
  recommended: z.boolean().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
});

const schema = z.object({
  sendAmountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 250000.00'),
  providerQuote: providerQuoteSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, schema);

    const breakdown = buildQuote({
      sendAmountNgn: body.sendAmountNgn,
      config: {
        ngnPerUsd: env.NGN_PER_USD_INDICATIVE,
        ngnFundingFeeBps: env.NGN_FUNDING_FEE_BPS,
        bobPerUsdIndicative: env.BOB_PER_USD_INDICATIVE,
      },
      providerQuote: body.providerQuote as ProviderQuote | undefined,
    });

    const quote = await db.quote.create({
      data: {
        ownerUserId: user.id,
        sendAmountMinor: breakdown.sendAmountMinor,
        fundingFeeMinor: breakdown.fundingFeeMinor,
        settlementAmount: breakdown.settlementAmount,
        settlementNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
        ngnToAssetRate: breakdown.ngnToAssetRate,
        payoutAmountMinor: breakdown.payoutAmountMinor,
        payoutFeeMinor: breakdown.payoutFeeMinor,
        networkFeeMinor: breakdown.networkFeeMinor,
        providerQuoteId: breakdown.providerQuoteId,
        provider: breakdown.provider,
        providerRate: breakdown.payoutRate,
        providerRail: breakdown.providerRail,
        guaranteed: breakdown.guaranteed,
        ngnRateSource: 'indicative',
        expiresAt: breakdown.expiresAt,
        providerPayload: body.providerQuote ? (body.providerQuote as object) : undefined,
      },
    });

    return ok(
      serializeBigInt({
        id: quote.id,
        ...breakdown,
        expiresAt: breakdown.expiresAt.toISOString(),
      }),
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
