import { afterEach, describe, expect, it, vi } from 'vitest';

// The single rule these tests exist to defend: the app must never render a
// plausible-looking bank account unless money really will arrive there.
//
// `env` validates lazily and caches, so each case resets the module registry
// and re-imports with a fresh process.env.

const BASE = {
  DATABASE_URL: 'postgresql://u:p@example.neon.tech/db?sslmode=require',
  POLLAR_SECRET_KEY: 'sec_testnet_' + 'a'.repeat(32),
  POLLAR_APP_ID: 'app_test',
  STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
  SESSION_SECRET: 'x'.repeat(40),
  NGN_PER_USD_INDICATIVE: '1650.00',
  NGN_FUNDING_FEE_BPS: '150',
  BOB_PER_USD_INDICATIVE: '6.96',
  OPERATOR_EMAILS: '',
};

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
  vi.resetModules();
});

async function instructionsFor(overrides: Record<string, string>) {
  process.env = { ...saved, ...BASE, ...overrides } as NodeJS.ProcessEnv;
  vi.resetModules();
  const mod = await import('@/lib/corridor/funding-instructions');
  return mod.buildFundingInstructions('APX-TEST-0001');
}

/** A string a person could plausibly type into a banking app as an account. */
function looksLikeARealAccount(value: string): boolean {
  return /^\d{10}$/.test(value.replace(/\s/g, '')) && !/^0+$/.test(value.replace(/\s/g, ''));
}

describe('funding instructions', () => {
  it('SIMULATED shows no account at all', async () => {
    const i = await instructionsFor({ NGN_FUNDING_MODE: 'SIMULATED' });

    expect(i.isReal).toBe(false);
    expect(i.tone).toBe('simulated');
    expect(i.accountNumber).toMatch(/NO ACCOUNT/i);
    expect(looksLikeARealAccount(i.accountNumber)).toBe(false);
    expect(i.warning).toMatch(/no money will move/i);
  });

  it('SANDBOX shows labelled test details that cannot pass for a real account', async () => {
    const i = await instructionsFor({ NGN_FUNDING_MODE: 'SANDBOX' });

    expect(i.isReal).toBe(false);
    expect(i.tone).toBe('sandbox');
    // Demo-complete: a partner, a bank and an account are all present…
    expect(i.partnerName).toBeTruthy();
    expect(i.bankName).toBeTruthy();
    expect(i.accountNumber).toBeTruthy();
    // …but the account is all zeroes, which is not a valid NUBAN.
    expect(looksLikeARealAccount(i.accountNumber)).toBe(false);
    expect(i.warning).toMatch(/no money moves/i);
    expect(`${i.partnerName} ${i.bankName}`.toLowerCase()).toContain('sandbox');
  });

  it('SANDBOX prefers operator-supplied test details when configured', async () => {
    const i = await instructionsFor({
      NGN_FUNDING_MODE: 'SANDBOX',
      NGN_PARTNER_NAME: 'Test Partner Ltd',
      NGN_PARTNER_BANK: 'Test Bank',
      NGN_PARTNER_ACCOUNT: '0123456789',
    });

    expect(i.partnerName).toBe('Test Partner Ltd');
    expect(i.accountNumber).toBe('0123456789');
    // Still not real, and still carries a warning.
    expect(i.isReal).toBe(false);
    expect(i.warning).toBeTruthy();
  });

  it('LIVE shows the real account with no warning', async () => {
    const i = await instructionsFor({
      NGN_FUNDING_MODE: 'LIVE',
      NGN_PARTNER_NAME: 'Real Partner Ltd',
      NGN_PARTNER_BANK: 'GTBank',
      NGN_PARTNER_ACCOUNT: '0123456789',
    });

    expect(i.isReal).toBe(true);
    expect(i.tone).toBe('live');
    expect(i.accountNumber).toBe('0123456789');
    expect(i.warning).toBeNull();
  });

  it('refuses to boot LIVE without complete partner details', async () => {
    // Otherwise the UI would render an empty "real" collection account.
    await expect(
      instructionsFor({ NGN_FUNDING_MODE: 'LIVE', NGN_PARTNER_NAME: 'Only A Name' }),
    ).rejects.toThrow(/NGN_PARTNER_NAME, NGN_PARTNER_BANK and NGN_PARTNER_ACCOUNT/);
  });

  it('only LIVE is ever marked real', async () => {
    for (const mode of ['SIMULATED', 'SANDBOX']) {
      const i = await instructionsFor({ NGN_FUNDING_MODE: mode });
      expect(i.isReal, `${mode} must not be marked real`).toBe(false);
      expect(i.warning, `${mode} must carry a warning`).toBeTruthy();
    }
  });

  it('always carries the transfer reference, which is how a payment is matched', async () => {
    for (const mode of ['SIMULATED', 'SANDBOX']) {
      const i = await instructionsFor({ NGN_FUNDING_MODE: mode });
      expect(i.reference).toBe('APX-TEST-0001');
    }
  });
});
