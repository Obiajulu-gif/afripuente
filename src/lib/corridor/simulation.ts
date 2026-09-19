import type { ExecutionMode, LegStatuses } from './state';

export interface SimulationRecord extends LegStatuses {
  state: string;
  fundingMode: ExecutionMode;
  settlementMode: ExecutionMode;
  payoutMode: ExecutionMode;
  delivery?: unknown;
  settlement?: unknown;
  payoutOrder?: unknown;
}

// Never advance a live/testnet leg or a record with external execution evidence.
export function canSimulate(t: SimulationRecord): boolean {
  return ['SANDBOX', 'SIMULATED'].includes(t.fundingMode)
    && t.settlementMode === 'SIMULATED' && t.payoutMode === 'SIMULATED'
    && !t.delivery && !t.settlement && !t.payoutOrder
    && !['CANCELLED', 'FAILED', 'REFUNDED', 'MANUAL_REVIEW'].includes(t.state);
}

export function nextSimulationStep(t: SimulationRecord): { label: string; statuses: LegStatuses } | null {
  if (!canSimulate(t)) return null;
  const s: LegStatuses = { fundingStatus: t.fundingStatus, settlementStatus: t.settlementStatus, payoutStatus: t.payoutStatus };
  if (s.payoutStatus === 'NOT_STARTED' && s.settlementStatus === 'NOT_STARTED') {
    if (s.fundingStatus === 'AWAITING_FUNDING') return { label: 'Simulate bank payment', statuses: { ...s, fundingStatus: 'REPORTED' } };
    if (s.fundingStatus === 'REPORTED') return { label: 'Simulate funding confirmation', statuses: { ...s, fundingStatus: 'VERIFIED', settlementStatus: 'ASSET_DELIVERY_PENDING' } };
  }
  if (s.fundingStatus !== 'VERIFIED') return null;
  if (s.payoutStatus === 'NOT_STARTED') {
    if (s.settlementStatus === 'ASSET_DELIVERY_PENDING') return { label: 'Simulate asset delivery', statuses: { ...s, settlementStatus: 'ASSET_DELIVERED' } };
    if (s.settlementStatus === 'ASSET_DELIVERED') return { label: 'Simulate Stellar settlement', statuses: { ...s, settlementStatus: 'CONFIRMED' } };
    if (s.settlementStatus === 'CONFIRMED') return { label: 'Simulate payout processing', statuses: { ...s, payoutStatus: 'PENDING' } };
  }
  if (s.settlementStatus === 'CONFIRMED' && s.payoutStatus === 'PENDING') return { label: 'Simulate recipient payment', statuses: { ...s, payoutStatus: 'COMPLETED' } };
  return null;
}

export function simulationVersion(t: LegStatuses): string {
  return `${t.fundingStatus}:${t.settlementStatus}:${t.payoutStatus}`;
}
