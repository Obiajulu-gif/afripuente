import type { Tone } from '@/components/ui';
import type { TransferState } from '@/lib/corridor/state';

// Single source of truth for how a transfer state is described to a person.
// Kept out of components so every screen says the same thing, and so the
// wording can be reviewed in one place.

const LABELS: Record<TransferState, string> = {
  DRAFT: 'Draft',
  AWAITING_FUNDING: 'Waiting for your payment',
  FUNDING_REVIEW: 'Checking your payment',
  SETTLING: 'Sending',
  PAYING_OUT: 'Recipient payment pending',
  COMPLETED: 'Completed',
  MANUAL_REVIEW: 'Being reviewed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

const TONES: Record<TransferState, Tone> = {
  DRAFT: 'neutral',
  AWAITING_FUNDING: 'pending',
  FUNDING_REVIEW: 'pending',
  SETTLING: 'info',
  PAYING_OUT: 'info',
  COMPLETED: 'success',
  MANUAL_REVIEW: 'danger',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
};

/** Short, plain-language label. Never a raw enum. */
export function stateLabel(state: string): string {
  return LABELS[state as TransferState] ?? state;
}

export function stateTone(state: string): Tone {
  return TONES[state as TransferState] ?? 'neutral';
}

/** States that need the user or an operator to do something. */
export function needsAttention(state: string): boolean {
  return state === 'AWAITING_FUNDING' || state === 'MANUAL_REVIEW' || state === 'FAILED';
}

/** The single next action a user can take, or null when it is on us. */
export function nextAction(state: string): string | null {
  switch (state) {
    case 'AWAITING_FUNDING':
      return 'Make the bank transfer using your reference';
    case 'MANUAL_REVIEW':
      return 'We are reviewing this — no action needed from you yet';
    case 'FAILED':
      return 'Review the details and start a new payment';
    default:
      return null;
  }
}
