// Derivation of the user-facing transfer state from the three independent leg
// statuses, plus the execution-mode roll-up.
//
// These string unions mirror the Prisma enums exactly. `assertEnumsAligned` in
// the test suite fails if the schema and this file ever drift apart.

export type FundingStatus =
  | 'AWAITING_FUNDING'
  | 'REPORTED'
  | 'VERIFIED'
  | 'MISMATCHED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'FAILED';

export type SettlementStatus =
  | 'NOT_STARTED'
  | 'ASSET_DELIVERY_PENDING'
  | 'ASSET_DELIVERED'
  | 'AWAITING_AUTHORIZATION'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED';

export type PayoutStatus =
  | 'NOT_STARTED'
  | 'ORDER_CREATED'
  | 'KYC_REQUIRED'
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'MANUAL_HANDOFF';

export type TransferState =
  | 'DRAFT'
  | 'AWAITING_FUNDING'
  | 'FUNDING_REVIEW'
  | 'SETTLING'
  | 'PAYING_OUT'
  | 'COMPLETED'
  | 'MANUAL_REVIEW'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type ExecutionMode = 'SIMULATED' | 'SANDBOX' | 'TESTNET' | 'LIVE' | 'MANUALLY_VERIFIED';

export interface LegStatuses {
  fundingStatus: FundingStatus;
  settlementStatus: SettlementStatus;
  payoutStatus: PayoutStatus;
  cancelled?: boolean;
}

/**
 * Derive the roll-up state. Ordering matters: terminal and exceptional
 * conditions are checked before progress, so a transfer can never render as
 * "completed" while any leg has failed or needs review.
 */
export function deriveTransferState(s: LegStatuses): TransferState {
  // Cancellation only counts when nothing has actually moved. Once money is in
  // flight, "cancelled" would be a lie — the transfer is failing or refunding.
  if (s.cancelled) {
    const nothingMoved =
      s.fundingStatus === 'AWAITING_FUNDING' &&
      s.settlementStatus === 'NOT_STARTED' &&
      s.payoutStatus === 'NOT_STARTED';
    return nothingMoved ? 'CANCELLED' : 'MANUAL_REVIEW';
  }

  if (s.fundingStatus === 'REFUNDED') return 'REFUNDED';
  if (s.fundingStatus === 'REFUND_PENDING') return 'MANUAL_REVIEW';
  if (s.fundingStatus === 'MISMATCHED') return 'MANUAL_REVIEW';

  // A payout failure after a confirmed settlement is the dangerous case: the
  // money is on-chain but the recipient was not paid. Always manual review.
  if (s.payoutStatus === 'FAILED') {
    return s.settlementStatus === 'CONFIRMED' ? 'MANUAL_REVIEW' : 'FAILED';
  }
  if (s.fundingStatus === 'FAILED' || s.settlementStatus === 'FAILED') return 'FAILED';

  if (s.payoutStatus === 'COMPLETED') return 'COMPLETED';
  if (s.payoutStatus === 'MANUAL_HANDOFF') return 'MANUAL_REVIEW';
  if (
    s.payoutStatus === 'PENDING' ||
    s.payoutStatus === 'ORDER_CREATED' ||
    s.payoutStatus === 'KYC_REQUIRED'
  ) {
    return 'PAYING_OUT';
  }

  if (s.fundingStatus === 'REPORTED') return 'FUNDING_REVIEW';

  if (s.fundingStatus === 'VERIFIED') {
    return s.settlementStatus === 'NOT_STARTED' ? 'SETTLING' : 'SETTLING';
  }

  if (s.settlementStatus !== 'NOT_STARTED') return 'SETTLING';

  return 'AWAITING_FUNDING';
}

/**
 * A transfer is only "complete" when the payout provider confirmed the payout.
 * Settlement confirmation is explicitly NOT sufficient.
 */
export function isTerminallyComplete(s: LegStatuses): boolean {
  return s.payoutStatus === 'COMPLETED';
}

const MODE_RANK: Record<ExecutionMode, number> = {
  SIMULATED: 0,
  SANDBOX: 1,
  TESTNET: 2,
  MANUALLY_VERIFIED: 3,
  LIVE: 4,
};

/**
 * The honest overall execution mode is the WEAKEST leg, never the strongest.
 * A real testnet settlement plus a simulated payout reports SIMULATED.
 */
export function weakestMode(modes: ExecutionMode[]): ExecutionMode {
  if (modes.length === 0) return 'SIMULATED';
  return modes.reduce((weakest, m) => (MODE_RANK[m] < MODE_RANK[weakest] ? m : weakest));
}

/** True only when every leg ran against real money. */
export function isFullyLive(modes: ExecutionMode[]): boolean {
  return modes.length > 0 && modes.every((m) => m === 'LIVE');
}

export function describeMode(mode: ExecutionMode): string {
  switch (mode) {
    case 'SIMULATED':
      return 'Simulated — no external system was contacted';
    case 'SANDBOX':
      return 'Sandbox — provider test environment, not real money';
    case 'TESTNET':
      return 'Stellar testnet — real SDK call, not redeemable for real money';
    case 'MANUALLY_VERIFIED':
      return 'Manually verified by an operator against an external record';
    case 'LIVE':
      return 'Live — real money';
  }
}

export interface TimelineStep {
  key: string;
  label: string;
  state: 'done' | 'active' | 'pending' | 'blocked';
  detail?: string;
}

/** Plain-language timeline. Technical detail belongs in an expandable section. */
export function buildTimeline(s: LegStatuses): TimelineStep[] {
  const fundingDone = s.fundingStatus === 'VERIFIED';
  const fundingBlocked = s.fundingStatus === 'MISMATCHED' || s.fundingStatus === 'FAILED';

  const deliveryDone =
    s.settlementStatus === 'ASSET_DELIVERED' ||
    s.settlementStatus === 'AWAITING_AUTHORIZATION' ||
    s.settlementStatus === 'SUBMITTED' ||
    s.settlementStatus === 'CONFIRMED';

  const settlementDone = s.settlementStatus === 'CONFIRMED';
  const payoutDone = s.payoutStatus === 'COMPLETED';

  return [
    {
      key: 'funding',
      label: 'Bank payment received',
      state: fundingBlocked
        ? 'blocked'
        : fundingDone
          ? 'done'
          : s.fundingStatus === 'REPORTED'
            ? 'active'
            : 'pending',
      detail:
        s.fundingStatus === 'REPORTED'
          ? 'You told us you have paid. We are checking the bank record.'
          : undefined,
    },
    {
      key: 'delivery',
      label: 'Dollars ready to send',
      state: deliveryDone ? 'done' : fundingDone ? 'active' : 'pending',
    },
    {
      key: 'settlement',
      label: 'Payment sent on Stellar',
      state:
        s.settlementStatus === 'FAILED'
          ? 'blocked'
          : settlementDone
            ? 'done'
            : s.settlementStatus === 'SUBMITTED' ||
                s.settlementStatus === 'AWAITING_AUTHORIZATION'
              ? 'active'
              : 'pending',
    },
    {
      key: 'payout',
      label: 'Recipient payment',
      state:
        s.payoutStatus === 'FAILED'
          ? 'blocked'
          : payoutDone
            ? 'done'
            : s.payoutStatus === 'NOT_STARTED'
              ? 'pending'
              : 'active',
      detail:
        s.payoutStatus === 'MANUAL_HANDOFF'
          ? 'Being completed manually by the payout provider.'
          : s.payoutStatus === 'KYC_REQUIRED'
            ? 'Identity check required before the payout can run.'
            : undefined,
    },
  ];
}
