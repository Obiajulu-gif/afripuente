import 'server-only';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { formatMoney, fromMinorUnits } from '@/lib/money';
import {
  buildTimeline,
  deriveTransferState,
  isFullyLive,
  weakestMode,
  type ExecutionMode,
  type FundingStatus,
  type PayoutStatus,
  type SettlementStatus,
} from '@/lib/corridor/state';

/**
 * Assemble everything a transfer screen needs, server-side.
 *
 * Ownership is enforced here rather than in the page, so no screen can
 * accidentally render another user's transfer.
 */
export async function loadTransferForUser(transferId: string, userId: string, isOperator = false) {
  const transfer = await db.transfer.findUnique({
    where: { id: transferId },
    include: { quote: true, funding: true, delivery: true, settlement: true, payoutOrder: true },
  });

  if (!transfer) return { error: 'NOT_FOUND' as const };
  if (transfer.userId !== userId && !isOperator) return { error: 'FORBIDDEN' as const };

  const statuses = {
    fundingStatus: transfer.fundingStatus as FundingStatus,
    settlementStatus: transfer.settlementStatus as SettlementStatus,
    payoutStatus: transfer.payoutStatus as PayoutStatus,
  };

  const modes: ExecutionMode[] = [
    transfer.fundingMode as ExecutionMode,
    transfer.settlementMode as ExecutionMode,
    transfer.payoutMode as ExecutionMode,
  ];

  const q = transfer.quote;

  return {
    error: null,
    transfer,
    view: {
      id: transfer.id,
      reference: transfer.reference,
      recipientName: transfer.recipientName,
      recipientAccountMask: transfer.recipientAccountMask,
      state: deriveTransferState(statuses),
      storedState: transfer.state,
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,

      timeline: buildTimeline(statuses),
      statuses,

      modes: {
        funding: transfer.fundingMode as ExecutionMode,
        settlement: transfer.settlementMode as ExecutionMode,
        payout: transfer.payoutMode as ExecutionMode,
        overall: weakestMode(modes),
        fullyLive: isFullyLive(modes),
      },

      money: q
        ? {
            sendDisplay: formatMoney(q.sendAmountMinor, 'NGN'),
            fundingFeeDisplay: formatMoney(q.fundingFeeMinor, 'NGN'),
            payoutDisplay: formatMoney(q.payoutAmountMinor, 'BOB'),
            payoutFeeDisplay: formatMoney(q.payoutFeeMinor, 'BOB'),
            settlementAmount: q.settlementAmount,
            settlementAsset: q.settlementAsset,
            settlementNetwork: q.settlementNetwork,
            ngnToAssetRate: q.ngnToAssetRate,
            payoutRate: q.providerRate,
            guaranteed: q.guaranteed,
            expiresAt: q.expiresAt,
            provider: q.provider,
            providerRail: q.providerRail,
          }
        : null,

      funding: transfer.funding
        ? {
            reference: transfer.funding.fundingReference,
            expectedDisplay: formatMoney(transfer.funding.expectedAmountMinor, 'NGN'),
            reportedAt: transfer.funding.reportedAt,
            verifiedAt: transfer.funding.verifiedAt,
            bankReference: transfer.funding.bankReference,
            receivedDisplay: transfer.funding.receivedAmountMinor
              ? formatMoney(transfer.funding.receivedAmountMinor, 'NGN')
              : null,
            mode: transfer.funding.mode as ExecutionMode,
          }
        : null,

      delivery: transfer.delivery
        ? {
            expectedAmount: transfer.delivery.expectedAmount,
            observedAmount: transfer.delivery.observedAmount,
            txHash: transfer.delivery.txHash,
            verifiedAt: transfer.delivery.verifiedAt,
            assetCode: transfer.delivery.assetCode,
            assetIssuer: transfer.delivery.assetIssuer,
          }
        : null,

      settlement: transfer.settlement
        ? {
            txHash: transfer.settlement.txHash,
            network: transfer.settlement.network,
            amount: transfer.settlement.amount,
            destination: transfer.settlement.destination,
            memo: transfer.settlement.memo,
            confirmedAt: transfer.settlement.confirmedAt,
            horizonVerifiedAt: transfer.settlement.horizonVerifiedAt,
            resultCode: transfer.settlement.resultCode,
          }
        : null,

      payout: transfer.payoutOrder
        ? {
            providerTxId: transfer.payoutOrder.providerTxId,
            provider: transfer.payoutOrder.provider,
            providerStatus: transfer.payoutOrder.providerStatus,
            anchorTransactionId: transfer.payoutOrder.anchorTransactionId,
            kycRequired: transfer.payoutOrder.kycRequired,
            kycUrl: transfer.payoutOrder.kycUrl,
            manualHandoffAt: transfer.payoutOrder.manualHandoffAt,
            manualHandoffNote: transfer.payoutOrder.manualHandoffNote,
            completedAt: transfer.payoutOrder.completedAt,
            failureReason: transfer.payoutOrder.failureReason,
          }
        : null,

      fundingInstructions: buildFundingInstructions(transfer.reference),
    },
  };
}

/**
 * Nigerian funding instructions.
 *
 * In SIMULATED mode these are explicitly sandbox instructions that cannot be
 * mistaken for a real collection account — no plausible-looking account number
 * is ever rendered.
 */
export function buildFundingInstructions(reference: string) {
  const live = env.NGN_FUNDING_MODE === 'LIVE';
  return {
    mode: env.NGN_FUNDING_MODE,
    isReal: live,
    partnerName: live ? env.NGN_PARTNER_NAME : 'SANDBOX — no real partner configured',
    bankName: live ? env.NGN_PARTNER_BANK : 'SANDBOX — do not send money',
    accountNumber: live ? env.NGN_PARTNER_ACCOUNT : 'NO ACCOUNT — SANDBOX MODE',
    reference,
    warning: live
      ? null
      : 'This is a sandbox funding instruction. There is no account to pay and no money will move. Do not attempt a real bank transfer.',
  };
}

export function formatAsset(amount: string, code: string): string {
  return `${amount} ${code}`;
}

export { fromMinorUnits };
