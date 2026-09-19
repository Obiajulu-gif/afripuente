import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { fail, ok, parseBody, toErrorResponse } from '@/lib/api';
import { deriveTransferState } from '@/lib/corridor/state';
import { nextSimulationStep, simulationVersion } from '@/lib/corridor/simulation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseBody(request, z.object({ version: z.string().min(1).max(150) }));
    return await db.$transaction(async (tx) => {
      const t = await tx.transfer.findUnique({ where: { id }, include: { delivery: true, settlement: true, payoutOrder: true } });
      if (!t || t.userId !== user.id) return fail('NOT_FOUND', 'Transfer not found.', 404);
      const next = nextSimulationStep(t);
      if (!next) return fail('NOT_SIMULATABLE', 'This transfer cannot advance in the sandbox.', 409);
      if (body.version !== simulationVersion(t)) return fail('STALE_STEP', 'Refresh to see the current step.', 409);
      const changed = await tx.transfer.updateMany({
        where: { id, userId: user.id, updatedAt: t.updatedAt, fundingMode: t.fundingMode, settlementMode: 'SIMULATED', payoutMode: 'SIMULATED' },
        data: {
          fundingStatus: next.statuses.fundingStatus,
          settlementStatus: next.statuses.settlementStatus,
          payoutStatus: next.statuses.payoutStatus,
          state: deriveTransferState(next.statuses),
          completedAt: next.statuses.payoutStatus === 'COMPLETED' ? new Date() : null,
        },
      });
      if (changed.count !== 1) return fail('STALE_STEP', 'Refresh to see the current step.', 409);
      // Statuses are simulated. Do not fabricate bank receipts, hashes, provider
      // orders or independent verification timestamps in the evidence tables.
      await tx.auditEvent.create({ data: {
        actorType: 'USER', actorUserId: user.id, transferId: id,
        action: 'sandbox.step_simulated',
        metadata: { from: body.version, to: simulationVersion(next.statuses), mode: 'SIMULATED' },
      } });
      return ok({ state: deriveTransferState(next.statuses), version: simulationVersion(next.statuses) });
    }, { timeout: 15000 });
  } catch (err) { return toErrorResponse(err); }
}
