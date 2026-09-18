import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { fail, ok, parseBody, serializeBigInt, toErrorResponse } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { isQuoteExpired } from '@/lib/corridor/quote';
import { generateReference, maskAccount } from '@/lib/corridor/reference';
import { deriveTransferState } from '@/lib/corridor/state';

const schema = z.object({
  quoteId: z.string().min(1),
  // Client-generated, stable across retries of the same user intent.
  idempotencyKey: z.string().min(8).max(128),
  recipientName: z.string().min(2).max(120),
  /**
   * Keyed exactly as the provider's `requiredFields[].key`. We do not invent a
   * Bolivian bank form: whatever Pollar's quote asked for is what we store.
   */
  recipientFields: z.record(z.string(), z.string()),
  accountFieldKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, schema);

    // Idempotency: a repeated submit (double click, retry after a timeout)
    // returns the ORIGINAL transfer instead of creating a second one.
    const existing = await db.transfer.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { funding: true, quote: true },
    });
    if (existing) {
      if (existing.userId !== user.id) {
        return fail('FORBIDDEN', 'You do not have access to that transfer.', 403);
      }
      return ok(serializeBigInt({ id: existing.id, reference: existing.reference, reused: true }));
    }

    const quote = await db.quote.findUnique({ where: { id: body.quoteId } });
    if (!quote) return fail('UNKNOWN_QUOTE', 'That quote no longer exists.', 404);
    if (quote.ownerUserId !== user.id) {
      return fail('FORBIDDEN', 'Get a new quote for your signed-in account.', 403);
    }
    if (quote.settlementNetwork !== (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet')) {
      return fail('NETWORK_MISMATCH', 'Get a new quote for the configured network.', 409);
    }
    if (quote.acceptedAt) {
      return fail('QUOTE_ALREADY_USED', 'That quote was already used for another transfer.', 409);
    }
    if (isQuoteExpired(quote.expiresAt)) {
      return fail('QUOTE_EXPIRED', 'That quote expired. Please get a new one.', 409);
    }

    const accountValue = body.accountFieldKey
      ? body.recipientFields[body.accountFieldKey]
      : undefined;

    const reference = generateReference();

    const created = await db.$transaction(async (tx) => {
      // Claim the quote atomically: updateMany with acceptedAt null means two
      // concurrent requests cannot both attach to the same quote.
      const claimed = await tx.quote.updateMany({
        where: { id: quote.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new Prisma.PrismaClientKnownRequestError('Quote already claimed', {
          code: 'P2002',
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      const transfer = await tx.transfer.create({
        data: {
          userId: user.id,
          idempotencyKey: body.idempotencyKey,
          reference,
          quoteId: quote.id,
          recipientName: body.recipientName,
          recipientFields: body.recipientFields,
          recipientAccountMask: accountValue ? maskAccount(accountValue) : null,
          fundingStatus: 'AWAITING_FUNDING',
          settlementStatus: 'NOT_STARTED',
          payoutStatus: 'NOT_STARTED',
          state: deriveTransferState({
            fundingStatus: 'AWAITING_FUNDING',
            settlementStatus: 'NOT_STARTED',
            payoutStatus: 'NOT_STARTED',
          }),
          // Each leg records how it will actually run. The Nigerian leg's mode
          // comes from configuration, not from a hopeful default.
          fundingMode: env.NGN_FUNDING_MODE === 'LIVE' ? 'LIVE' : env.NGN_FUNDING_MODE,
          settlementMode:
            (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') === 'mainnet'
              ? 'LIVE'
              : 'TESTNET',
          // Until a real ramp order exists this is simulated, and says so.
          payoutMode: 'SIMULATED',
        },
      });

      await tx.fundingRecord.create({
        data: {
          transferId: transfer.id,
          fundingReference: reference,
          expectedAmountMinor: quote.sendAmountMinor,
          currency: 'NGN',
          mode: env.NGN_FUNDING_MODE === 'LIVE' ? 'LIVE' : env.NGN_FUNDING_MODE,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorType: 'USER',
          actorUserId: user.id,
          action: 'transfer.created',
          transferId: transfer.id,
          metadata: { reference, quoteId: quote.id },
        },
      });

      return transfer;
    });

    return ok(serializeBigInt({ id: created.id, reference: created.reference, reused: false }), 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return fail('DUPLICATE', 'That request was already processed.', 409);
    }
    return toErrorResponse(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const transfers = await db.transfer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { quote: true },
    });

    return ok(
      serializeBigInt(
        transfers.map((t) => ({
          id: t.id,
          reference: t.reference,
          recipientName: t.recipientName,
          state: t.state,
          createdAt: t.createdAt.toISOString(),
          sendAmountMinor: t.quote?.sendAmountMinor ?? 0n,
          payoutAmountMinor: t.quote?.payoutAmountMinor ?? 0n,
        })),
      ),
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
