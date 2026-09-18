import { afterEach, describe, expect, it, vi } from 'vitest';

// The declared network and the Horizon server must agree, because Horizon is
// how settlement is independently verified. A mismatch does not degrade
// verification, it silently invalidates it.

const BASE = {
  DATABASE_URL: 'postgresql://u:p@example.neon.tech/db?sslmode=require',
  POLLAR_SECRET_KEY: 'sec_mainnet_' + 'a'.repeat(32),
  POLLAR_APP_ID: 'app_test',
  SESSION_SECRET: 'x'.repeat(40),
  NGN_PER_USD_INDICATIVE: '1650.00',
  NGN_FUNDING_FEE_BPS: '150',
  BOB_PER_USD_INDICATIVE: '6.96',
  OPERATOR_EMAILS: '',
  NGN_FUNDING_MODE: 'SANDBOX',
};

const MAINNET = 'https://horizon.stellar.org';
const TESTNET = 'https://horizon-testnet.stellar.org';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.resetModules();
});

async function loadEnv(overrides: Record<string, string>) {
  process.env = { ...saved, ...BASE, ...overrides } as NodeJS.ProcessEnv;
  vi.resetModules();
  const mod = await import('@/lib/env');
  // The Proxy validates on first property access.
  return mod.env.STELLAR_HORIZON_URL;
}

describe('network / Horizon consistency', () => {
  it('accepts mainnet with mainnet Horizon', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet', STELLAR_HORIZON_URL: MAINNET }),
    ).resolves.toBe(MAINNET);
  });

  it('accepts testnet with testnet Horizon', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_STELLAR_NETWORK: 'testnet', STELLAR_HORIZON_URL: TESTNET }),
    ).resolves.toBe(TESTNET);
  });

  it('REFUSES mainnet pointed at testnet Horizon', async () => {
    // The exact misconfiguration found in production: real transactions would
    // be looked for on the test ledger and never found.
    await expect(
      loadEnv({ NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet', STELLAR_HORIZON_URL: TESTNET }),
    ).rejects.toThrow(/Network mismatch.*mainnet.*testnet server/s);
  });

  it('REFUSES testnet pointed at mainnet Horizon', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_STELLAR_NETWORK: 'testnet', STELLAR_HORIZON_URL: MAINNET }),
    ).rejects.toThrow(/Network mismatch/);
  });

  it('defaults to testnet when the network is unset', async () => {
    const env = { ...BASE, STELLAR_HORIZON_URL: TESTNET } as Record<string, string>;
    process.env = { ...saved, ...env };
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    vi.resetModules();
    const mod = await import('@/lib/env');
    expect(mod.env.STELLAR_HORIZON_URL).toBe(TESTNET);
  });
});
