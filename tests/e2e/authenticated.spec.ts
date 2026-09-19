import { test, expect, request as requests, type APIRequestContext } from '@playwright/test';
import { Keypair } from '@stellar/stellar-sdk';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
// Node 20.12+; avoid importing Next's transitive dependencies, which are not
// available from the project root under pnpm's strict module resolution.
try { process.loadEnvFile('.env.local'); } catch { /* CI supplies environment directly. */ }

// Exercise our real HTTP/database path with disposable, locally generated
// signing keys. This does not simulate or claim a Pollar OTP/browser session.
test('wallet login, ownership, replay protection and complete sandbox journey', async ({ baseURL, browser, viewport, isMobile }) => {
  test.skip(!baseURL?.startsWith('http://localhost:'), 'Disposable data test is local only');
  test.slow();
  const db = new PrismaClient();
  const userIds: string[] = [];
  const quoteIds: string[] = [];
  const contexts: APIRequestContext[] = [];
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  async function login() {
    const ctx = await requests.newContext({ baseURL });
    contexts.push(ctx);
    const key = Keypair.random();
    const challenge = await ctx.post('/api/auth/challenge', { data: { address: key.publicKey() } });
    expect(challenge.status()).toBe(200);
    const nonce = (await challenge.json()).data.nonce;
    const body = {
      address: key.publicKey(), nonce, network, scheme: 'sep53',
      signature: key.sign(createHash('sha256').update(`Stellar Signed Message:\n${nonce}`).digest()).toString('base64'),
      pollarUserId: 'spoofed-operator-id', email: 'operator@example.com',
    };
    const result = await ctx.post('/api/auth/verify', { data: body });
    expect(result.status()).toBe(200);
    const user = (await result.json()).data;
    userIds.push(user.userId);
    expect(user.role).toBe('SENDER');
    expect((await ctx.post('/api/auth/verify', { data: body })).status()).toBe(400);
    return ctx;
  }

  try {
    const sender = await login();
    const other = await login();
    const priced = await sender.post('/api/quotes', { data: { sendAmountNgn: '250000.00' } });
    expect(priced.status()).toBe(200);
    const quote = (await priced.json()).data;
    quoteIds.push(quote.id);
    const body = { quoteId: quote.id, idempotencyKey: randomUUID(), recipientName: 'Automated sandbox test', recipientFields: {} };
    expect((await other.post('/api/transfers', { data: body })).status()).toBe(403);
    const created = await sender.post('/api/transfers', { data: body });
    expect(created.status()).toBe(201);
    const transfer = (await created.json()).data;
    const replay = await sender.post('/api/transfers', { data: body });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).data.id).toBe(transfer.id);
    expect((await sender.post('/api/transfers', { data: { ...body, idempotencyKey: randomUUID() } })).status()).toBe(409);
    expect((await other.post(`/api/transfers/${transfer.id}/report-funding`, { data: {} })).status()).toBe(403);
    expect((await sender.post(`/api/transfers/${transfer.id}/report-funding`, { data: {} })).status()).toBe(200);
    expect((await sender.post(`/api/operator/transfers/${transfer.id}/verify-funding`, { data: { bankReference: 'TEST', receivedAmountNgn: '250000.00', decision: 'VERIFIED' } })).status()).toBe(403);
    const stored = await db.transfer.findUniqueOrThrow({ where: { id: transfer.id } });
    expect(stored.fundingStatus).toBe('REPORTED');
    expect(stored.settlementStatus).toBe('NOT_STARTED');
    expect(stored.payoutStatus).toBe('NOT_STARTED');
    expect(stored.fundingMode).not.toBe('LIVE');
    expect((await sender.get(`/transfers/${transfer.id}`)).status()).toBe(200);
    const endpoint = `/api/transfers/${transfer.id}/simulate`;
    const version = 'REPORTED:NOT_STARTED:NOT_STARTED';
    expect((await other.post(endpoint, { data: { version } })).status()).toBe(404);
    await db.transfer.update({ where: { id: transfer.id }, data: { settlementMode: 'LIVE' } });
    expect((await sender.post(endpoint, { data: { version } })).status()).toBe(409);
    await db.transfer.update({ where: { id: transfer.id }, data: { settlementMode: 'SIMULATED' } });
    expect((await sender.post(endpoint, { data: { version } })).status()).toBe(200);
    expect((await sender.post(endpoint, { data: { version } })).status()).toBe(409);
    const ui = await browser.newContext({ viewport, isMobile, storageState: await sender.storageState() });
    try {
      const page = await ui.newPage();
      await page.goto(`${baseURL}/transfers/${transfer.id}`);
      for (const label of ['Simulate asset delivery', 'Simulate Stellar settlement', 'Simulate payout processing', 'Simulate recipient payment']) {
        await page.getByRole('button', { name: label, exact: true }).click();
      }
      await expect(page.getByRole('heading', { name: 'Sandbox receipt' })).toBeVisible({ timeout: 60_000 });
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Sandbox receipt' })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath('sandbox-receipt.png'), fullPage: true });
      const complete = await db.transfer.findUniqueOrThrow({ where: { id: transfer.id }, include: { settlement: true, payoutOrder: true, delivery: true } });
      expect(complete.state).toBe('COMPLETED');
      expect(complete.settlementMode).toBe('SIMULATED');
      expect(complete.settlement).toBeNull();
      expect(complete.payoutOrder).toBeNull();
      expect(complete.delivery).toBeNull();
    } finally { await ui.close(); }
  } finally {
    // Only records belonging to the randomly generated test identities.
    if (userIds.length) {
      await db.$transaction(async (tx) => {
        const transfers = await tx.transfer.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
        await tx.auditEvent.deleteMany({ where: { OR: [{ actorUserId: { in: userIds } }, { transferId: { in: transfers.map((t) => t.id) } }] } });
        const wallets = await tx.walletRef.findMany({ where: { userId: { in: userIds } }, select: { address: true } });
        await tx.transfer.deleteMany({ where: { userId: { in: userIds } } });
        await tx.quote.deleteMany({ where: { id: { in: quoteIds }, ownerUserId: { in: userIds } } });
        await tx.walletChallenge.deleteMany({ where: { address: { in: wallets.map((w) => w.address) } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }, { timeout: 30_000 });
    }
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    await db.$disconnect();
  }
});
