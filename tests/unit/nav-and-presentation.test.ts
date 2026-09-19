import { describe, expect, it } from 'vitest';
import { navItems } from '@/lib/nav';
import { needsAttention, nextAction, stateLabel, stateTone } from '@/lib/corridor/presentation';

describe('navigation', () => {
  it('hides the operator workspace from a non-operator', () => {
    const hrefs = navItems(false).map((i) => i.href);
    expect(hrefs).not.toContain('/operator');
    expect(hrefs).toEqual(['/dashboard', '/send', '/withdraw', '/activity']);
  });

  it('shows the operator workspace to an operator', () => {
    expect(navItems(true).map((i) => i.href)).toContain('/operator');
  });

  it('stays small — navigation should not sprawl', () => {
    expect(navItems(true).length).toBeLessThanOrEqual(5);
  });
});

describe('transfer state presentation', () => {
  it('never shows a raw enum to a user', () => {
    for (const state of [
      'AWAITING_FUNDING',
      'FUNDING_REVIEW',
      'SETTLING',
      'PAYING_OUT',
      'COMPLETED',
      'MANUAL_REVIEW',
      'FAILED',
      'REFUNDED',
      'CANCELLED',
    ]) {
      const label = stateLabel(state);
      expect(label).not.toBe(state);
      expect(label).not.toMatch(/_/);
    }
  });

  it('does not describe an in-flight transfer as completed', () => {
    expect(stateLabel('PAYING_OUT')).toMatch(/pending/i);
    expect(stateLabel('SETTLING')).not.toMatch(/complete/i);
    expect(stateLabel('FUNDING_REVIEW')).not.toMatch(/complete/i);
  });

  it('gives completed and failed distinct, non-colour-only meaning', () => {
    // Text must carry the meaning; tone is only reinforcement.
    expect(stateLabel('COMPLETED')).toBe('Completed');
    expect(stateLabel('FAILED')).toBe('Failed');
    expect(stateTone('COMPLETED')).toBe('success');
    expect(stateTone('FAILED')).toBe('danger');
  });

  it('treats a review state as needing attention, not as success', () => {
    expect(needsAttention('MANUAL_REVIEW')).toBe(true);
    expect(needsAttention('FAILED')).toBe(true);
    expect(needsAttention('AWAITING_FUNDING')).toBe(true);
    expect(needsAttention('COMPLETED')).toBe(false);
    expect(needsAttention('PAYING_OUT')).toBe(false);
    expect(stateTone('MANUAL_REVIEW')).toBe('danger');
  });

  it('does not invent an action for states the user cannot act on', () => {
    expect(nextAction('PAYING_OUT')).toBeNull();
    expect(nextAction('COMPLETED')).toBeNull();
    expect(nextAction('AWAITING_FUNDING')).toMatch(/bank transfer/i);
  });

  it('falls back to the raw value rather than throwing on an unknown state', () => {
    expect(stateLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(stateTone('SOMETHING_NEW')).toBe('neutral');
  });
});
