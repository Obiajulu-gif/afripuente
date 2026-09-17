import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { buildQuote } from '@/lib/corridor/quote';
import { fromMinorUnits } from '@/lib/money';
import { toErrorResponse } from '@/lib/api';

/**
 * Public, unauthenticated quote PREVIEW for the landing page.
 *
 * Deliberately limited:
 *  - no authentication, so a visitor can explore the corridor first
 *  - nothing is persisted; this creates no Quote row and no transfer
 *  - it never attaches a provider quote, so it is ALWAYS an estimate and says so
 *
 * The arithmetic is the same `buildQuote` the authenticated path uses, so the
 * numbers a visitor sees are produced by the real fee logic rather than
 * hardcoded marketing figures.
 */
const schema = z.object({
  amount: z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter an amount in naira, for example 250000')
    .optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = schema.safeParse({ amount: url.searchParams.get('amount') ?? undefined });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const amount = parsed.data.amount ?? '250000';

    const q = buildQuote({
      sendAmountNgn: Number(amount).toFixed(2),
      config: {
        ngnPerUsd: env.NGN_PER_USD_INDICATIVE,
        ngnFundingFeeBps: env.NGN_FUNDING_FEE_BPS,
        bobPerUsdIndicative: env.BOB_PER_USD_INDICATIVE,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          sendNgn: fromMinorUnits(q.sendAmountMinor, 'NGN'),
          fundingFeeNgn: fromMinorUnits(q.fundingFeeMinor, 'NGN'),
          settlementAmount: q.settlementAmount,
          settlementAsset: q.settlementAsset,
          receiveBob: fromMinorUnits(q.payoutAmountMinor, 'BOB'),
          ngnToAssetRate: q.ngnToAssetRate,
          payoutRate: q.payoutRate,
          // Always false on this endpoint — no provider quote is ever attached.
          guaranteed: q.guaranteed,
          estimatedAt: new Date().toISOString(),
        },
      },
      // Short cache: the rate is operator-set, so this is safe to reuse briefly.
      { headers: { 'cache-control': 'public, max-age=30' } },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
