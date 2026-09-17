import { z } from 'zod';
import { db } from '@/lib/db';
import { fail, ok, parseBody, toErrorResponse } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { deriveTransferState } from '@/lib/corridor/state';
import { toMinorUnits } from '@/lib/money';

const schema = z.object({
  reportedAmountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

/**
 * The sender reporting "I have paid".
 *
 * This is a CLAIM, not proof. It moves funding to REPORTED and nothing further:
 * it does not verify funding, does not create an on-chain balance, and does not
 * advance settlement. Only an operator reconciling the actual bank record can
 * mark funding VERIFIED.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseBody(request, schema);

    const transfer = await db.transfer.findUnique({
      where: { id },
      include: { funding: true },
    });
    if (!transfer) return fail('NOT_FOUND', 'Transfer not found.', 404);
    if (transfer.userId !== user.id) {
      return fail('FORBIDDEN', 'You do not have access to that transfer.', 403);
    }
    if (!transfer.funding) return fail('NO_FUNDING_RECORD', 'This transfer has no funding record.', 409);

    if (transfer.fundingStatus === 'VERIFIED') {
      // Already reconciled — reporting again changes nothing.
      return ok({ fundingStatus: transfer.fundingStatus, alreadyVerified: true });
    }

    const nextStatuses = {
      fundingStatus: 'REPORTED' as const,
      settlementStatus: transfer.settlementStatus,
      payoutStatus: transfer.payoutStatus,
    };

    await db.$transaction([
      db.fundingRecord.update({
        where: { transferId: transfer.id },
        data: {
          reportedAt: transfer.funding.reportedAt ?? new Date(),
          reportedAmountMinor: body.reportedAmountNgn
            ? toMinorUnits(body.reportedAmountNgn, 'NGN')
            : transfer.funding.expectedAmountMinor,
        },
      }),
      db.transfer.update({
        where: { id: transfer.id },
        data: {
          fundingStatus: 'REPORTED',
          state: deriveTransferState(nextStatuses),
        },
      }),
      db.auditEvent.create({
        data: {
          actorType: 'USER',
          actorUserId: user.id,
          action: 'funding.reported_by_sender',
          transferId: transfer.id,
          metadata: { note: 'Sender claim only; awaiting independent bank reconciliation.' },
        },
      }),
    ]);

    return ok({ fundingStatus: 'REPORTED' });
  } catch (err) {
    return toErrorResponse(err);
  }
}
