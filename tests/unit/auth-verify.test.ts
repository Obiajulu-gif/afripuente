import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
  challenge: vi.fn(), consume: vi.fn(), wallets: vi.fn(), upsert: vi.fn(),
  update: vi.fn(), walletUpsert: vi.fn(), audit: vi.fn(), session: vi.fn(), operator: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: {
  walletChallenge: { findUnique: mocks.challenge, updateMany: mocks.consume },
  walletRef: { findMany: mocks.wallets, upsert: mocks.walletUpsert },
  user: { upsert: mocks.upsert, update: mocks.update },
  auditEvent: { create: mocks.audit },
} }));
vi.mock('@/lib/env', () => ({ env: { STELLAR_HORIZON_URL: 'https://horizon.stellar.org' }, isOperatorWallet: mocks.operator }));
vi.mock('@/lib/auth/session', () => ({ createSession: mocks.session, AuthError: class extends Error {} }));
import { POST } from '@/app/api/auth/verify/route';

const key = Keypair.random();
const nonce = 'server-issued-nonce';
const payload = {
  pollarUserId: 'someone-elses-pollar-user', email: 'operator@example.com',
  address: key.publicKey(), nonce, network: 'mainnet', scheme: 'sep53',
  signature: key.sign(createHash('sha256').update(`Stellar Signed Message:\n${nonce}`).digest()).toString('base64'),
};
const request = (body = payload) => new Request('https://example.com/api/auth/verify', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'mainnet');
  mocks.challenge.mockResolvedValue({ address: key.publicKey(), expiresAt: new Date(Date.now() + 60_000), consumedAt: null });
  mocks.consume.mockResolvedValue({ count: 1 });
  mocks.wallets.mockResolvedValue([]);
  mocks.operator.mockReturnValue(false);
  mocks.upsert.mockResolvedValue({ id: 'new-user', role: 'SENDER' });
  mocks.update.mockResolvedValue({ id: 'existing-user', role: 'SENDER' });
});

describe('wallet-bound server login', () => {
  it('ignores claimed user id and operator email even with a valid signature', async () => {
    expect((await POST(request())).status).toBe(200);
    const input = mocks.upsert.mock.calls[0][0];
    expect(input.where.pollarUserId).toBe(`wallet:mainnet:${key.publicKey()}`);
    expect(input.create.role).toBe('SENDER');
    expect(input.create).not.toHaveProperty('email');
    expect(mocks.session).toHaveBeenCalledWith('new-user');
  });
  it('recovers an existing account only by its proven wallet', async () => {
    mocks.wallets.mockResolvedValue([{ userId: 'existing-user' }]);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].where).toEqual({ id: 'existing-user' });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('grants operator role only through the server wallet allowlist', async () => {
    mocks.operator.mockReturnValue(true);
    await POST(request());
    expect(mocks.operator).toHaveBeenCalledWith(key.publicKey(), 'mainnet');
    expect(mocks.upsert.mock.calls[0][0].create.role).toBe('OPERATOR');
  });
  it('rejects a different network before consuming a nonce', async () => {
    expect((await POST(request({ ...payload, network: 'testnet' }))).status).toBe(400);
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it('rejects a concurrent replay before creating a session', async () => {
    mocks.consume.mockResolvedValue({ count: 0 });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it('fails closed for legacy wallets attached to multiple users', async () => {
    mocks.wallets.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
