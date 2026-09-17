import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  deriveTransferState,
  isFullyLive,
  isTerminallyComplete,
  weakestMode,
  type LegStatuses,
} from '@/lib/corridor/state';

const base: LegStatuses = {
  fundingStatus: 'AWAITING_FUNDING',
  settlementStatus: 'NOT_STARTED',
  payoutStatus: 'NOT_STARTED',
};

describe('transfer state derivation', () => {
  it('starts awaiting funding', () => {
    expect(deriveTransferState(base)).toBe('AWAITING_FUNDING');
  });

  it('moves to funding review when the sender only REPORTS payment', () => {
    // "I have paid" is a claim, not proof — it must not read as verified.
    expect(deriveTransferState({ ...base, fundingStatus: 'REPORTED' })).toBe('FUNDING_REVIEW');
  });

  it('is completed ONLY when the payout provider confirms', () => {
    const settledButNotPaid: LegStatuses = {
      fundingStatus: 'VERIFIED',
      settlementStatus: 'CONFIRMED',
      payoutStatus: 'PENDING',
    };
    expect(deriveTransferState(settledButNotPaid)).toBe('PAYING_OUT');
    expect(isTerminallyComplete(settledButNotPaid)).toBe(false);

    const paid: LegStatuses = { ...settledButNotPaid, payoutStatus: 'COMPLETED' };
    expect(deriveTransferState(paid)).toBe('COMPLETED');
    expect(isTerminallyComplete(paid)).toBe(true);
  });

  it('escalates a payout failure AFTER a confirmed settlement to manual review', () => {
    // The dangerous case: funds left the wallet but the recipient was not paid.
    // This must never render as a plain failure.
    expect(
      deriveTransferState({
        fundingStatus: 'VERIFIED',
        settlementStatus: 'CONFIRMED',
        payoutStatus: 'FAILED',
      }),
    ).toBe('MANUAL_REVIEW');
  });

  it('treats a payout failure before settlement as a plain failure', () => {
    expect(
      deriveTransferState({
        fundingStatus: 'VERIFIED',
        settlementStatus: 'NOT_STARTED',
        payoutStatus: 'FAILED',
      }),
    ).toBe('FAILED');
  });

  it('sends a mismatched deposit to manual review', () => {
    expect(deriveTransferState({ ...base, fundingStatus: 'MISMATCHED' })).toBe('MANUAL_REVIEW');
  });

  it('shows a manual payout handoff as manual review, never as automated completion', () => {
    expect(
      deriveTransferState({
        fundingStatus: 'VERIFIED',
        settlementStatus: 'CONFIRMED',
        payoutStatus: 'MANUAL_HANDOFF',
      }),
    ).toBe('MANUAL_REVIEW');
  });

  it('only allows cancellation while nothing has moved', () => {
    expect(deriveTransferState({ ...base, cancelled: true })).toBe('CANCELLED');

    // Money already in flight must NOT read as cancelled.
    expect(
      deriveTransferState({
        fundingStatus: 'VERIFIED',
        settlementStatus: 'SUBMITTED',
        payoutStatus: 'NOT_STARTED',
        cancelled: true,
      }),
    ).toBe('MANUAL_REVIEW');
  });

  it('does not report REFUNDED while a refund is only pending', () => {
    expect(deriveTransferState({ ...base, fundingStatus: 'REFUND_PENDING' })).toBe('MANUAL_REVIEW');
    expect(deriveTransferState({ ...base, fundingStatus: 'REFUNDED' })).toBe('REFUNDED');
  });
});

describe('execution mode roll-up', () => {
  it('reports the WEAKEST leg, not the strongest', () => {
    expect(weakestMode(['TESTNET', 'SIMULATED', 'LIVE'])).toBe('SIMULATED');
    expect(weakestMode(['LIVE', 'MANUALLY_VERIFIED'])).toBe('MANUALLY_VERIFIED');
  });

  it('is only fully live when every leg is live', () => {
    expect(isFullyLive(['LIVE', 'LIVE', 'LIVE'])).toBe(true);
    expect(isFullyLive(['LIVE', 'TESTNET', 'LIVE'])).toBe(false);
    expect(isFullyLive([])).toBe(false);
  });

  it('never calls a testnet settlement with a simulated payout "live"', () => {
    const modes = ['MANUALLY_VERIFIED', 'TESTNET', 'SIMULATED'] as const;
    expect(isFullyLive([...modes])).toBe(false);
    expect(weakestMode([...modes])).toBe('SIMULATED');
  });
});

describe('timeline', () => {
  it('marks the funding step active but not done when only reported', () => {
    const steps = buildTimeline({ ...base, fundingStatus: 'REPORTED' });
    const funding = steps.find((s) => s.key === 'funding')!;

    expect(funding.state).toBe('active');
    expect(funding.label).toBe('Bank payment received');
    expect(funding.detail).toMatch(/checking the bank record/i);
  });

  it('blocks the funding step on a mismatch', () => {
    const steps = buildTimeline({ ...base, fundingStatus: 'MISMATCHED' });
    expect(steps.find((s) => s.key === 'funding')!.state).toBe('blocked');
  });

  it('labels a manual payout handoff plainly', () => {
    const steps = buildTimeline({
      fundingStatus: 'VERIFIED',
      settlementStatus: 'CONFIRMED',
      payoutStatus: 'MANUAL_HANDOFF',
    });
    const payout = steps.find((s) => s.key === 'payout')!;
    expect(payout.detail).toMatch(/manually by the payout provider/i);
  });
});
