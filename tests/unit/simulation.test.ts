import { describe, expect, it } from 'vitest';
import { canSimulate, nextSimulationStep, type SimulationRecord } from '@/lib/corridor/simulation';
import { deriveTransferState } from '@/lib/corridor/state';

const initial: SimulationRecord = { state: 'AWAITING_FUNDING', fundingStatus: 'AWAITING_FUNDING', settlementStatus: 'NOT_STARTED', payoutStatus: 'NOT_STARTED', fundingMode: 'SANDBOX', settlementMode: 'SIMULATED', payoutMode: 'SIMULATED' };
describe('sandbox boundary', () => {
  it('reaches completion in six separate steps without changing execution modes', () => {
    let current = initial;
    for (let i = 0; i < 6; i++) {
      const next = nextSimulationStep(current);
      expect(next).not.toBeNull();
      current = { ...current, ...next!.statuses, state: deriveTransferState(next!.statuses) };
      if (i < 5) expect(current.state).not.toBe('COMPLETED');
    }
    expect(current.state).toBe('COMPLETED');
    expect(nextSimulationStep(current)).toBeNull();
    expect(current.settlementMode).toBe('SIMULATED');
  });
  it('refuses live, testnet, manually verified, and externally executed records', () => {
    for (const field of ['fundingMode', 'settlementMode', 'payoutMode'] as const) {
      for (const mode of ['LIVE', 'TESTNET', 'MANUALLY_VERIFIED'] as const) expect(canSimulate({ ...initial, [field]: mode })).toBe(false);
    }
    for (const field of ['delivery', 'settlement', 'payoutOrder']) expect(canSimulate({ ...initial, [field]: { id: 'evidence' } })).toBe(false);
    for (const state of ['CANCELLED', 'FAILED', 'REFUNDED', 'MANUAL_REVIEW']) expect(nextSimulationStep({ ...initial, state })).toBeNull();
  });
  it('does not skip funding or recover failed states silently', () => {
    expect(nextSimulationStep({ ...initial, settlementStatus: 'CONFIRMED' })).toBeNull();
    expect(nextSimulationStep({ ...initial, fundingStatus: 'FAILED' })).toBeNull();
  });
});
