import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { fail, ok, parseBody, toErrorResponse } from '@/lib/api';
import { requireOperator } from '@/lib/auth/session';
import { deriveTransferState } from '@/lib/corridor/state';
import { toMinorUnits } from '@/lib/money';

const schema = z.object({
  bankReference: z.string().min(3).max(120),
  receivedAmountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  decision: z.enum(['VERIFIED', 'MISMATCHED']),
  notes: z.string().max(500).optional(),
});

/**
 * Operator reconciliation of the Nigerian bank receipt.
 *
 * Authority is re-checked server-side on every call — the client cannot assert
 * an operator role. The bank reference carries a UNIQUE constraint, so the same
 * real-world deposit can never be used to fund two transfers.
 *
 * Verifying funding does NOT create an on-chain balance. It only records that
 * naira arrived. Delivery of the settlement asset is tracked separately.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const operator = await requireOperator();
    const { id } = await params;
    const body = await parseBody(request, schema);

    const transfer = await db.transfer.findUnique({ where: { id }, include: { funding: true } });
    if (!transfer) return fail('NOT_FOUND', 'Transfer not found.', 404);
    if (!transfer.funding) return fail('NO_FUNDING_RECORD', 'This transfer has no funding record.', 409);
    if (transfer.funding.verifiedAt) {
      return fail('ALREADY_VERIFIED', 'Funding for this transfer was already reconciled.', 409);
    }

    const receivedMinor = toMinorUnits(body.receivedAmountNgn, 'NGN');
    const expectedMinor = transfer.funding.expectedAmountMinor;

    // An operator cannot mark a short or over payment as cleanly verified.
    // The amounts decide, not the button that was pressed.
    const amountMatches = receivedMinor === expectedMinor;
    const decision = body.decision === 'VERIFIED' && amountMatches ? 'VERIFIED' : 'MISMATCHED';

    const nextStatuses = {
      fundingStatus: decision as 'VERIFIED' | 'MISMATCHED',
      settlementStatus: transfer.settlementStatus,
      payoutStatus: transfer.payoutStatus,
    };

    try {
      await db.$transaction([
        db.fundingRecord.update({
          where: { transferId: transfer.id },
          data: {
            verifiedAt: new Date(),
            verifiedByUserId: operator.id,
            bankReference: body.bankReference,
            receivedAmountMinor: receivedMinor,
            receivedCurrency: 'NGN',
            mode: 'MANUALLY_VERIFIED',
            notes: body.notes,
          },
        }),
        db.transfer.update({
          where: { id: transfer.id },
          data: {
            fundingStatus: decision,
            fundingMode: 'MANUALLY_VERIFIED',
            // Funding verified means the asset must now be delivered — a
            // separate, independently verified step.
            settlementStatus:
              decision === 'VERIFIED' ? 'ASSET_DELIVERY_PENDING' : transfer.settlementStatus,
            state: deriveTransferState({
              ...nextStatuses,
              settlementStatus:
                decision === 'VERIFIED' ? 'ASSET_DELIVERY_PENDING' : transfer.settlementStatus,
            }),
            manualReviewReason:
              decision === 'MISMATCHED'
                ? `Received ${body.receivedAmountNgn} NGN against an expected amount.`
                : null,
          },
        }),
        db.auditEvent.create({
          data: {
            actorType: 'OPERATOR',
            actorUserId: operator.id,
            action: `funding.${decision.toLowerCase()}`,
            transferId: transfer.id,
            metadata: {
              bankReference: body.bankReference,
              amountMatches,
              notes: body.notes ?? null,
            },
          },
        }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return fail(
          'BANK_REFERENCE_REUSED',
          'That bank reference has already been used to fund another transfer.',
          409,
        );
      }
      throw err;
    }

    return ok({ fundingStatus: decision, amountMatches });
  } catch (err) {
    return toErrorResponse(err);
  }
}
