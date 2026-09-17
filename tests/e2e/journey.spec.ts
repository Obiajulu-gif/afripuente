import { expect, test } from '@playwright/test';

// End-to-end coverage of the parts of the journey reachable without an
// authenticated Pollar session. The authenticated legs need a real email OTP and
// are verified manually — see docs/proof-of-usage.md. These tests run on both
// desktop and mobile viewports (see playwright.config.ts).

test('landing page explains the corridor without inventing metrics', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Local money\. Connected continents\./ })).toBeVisible();
  await expect(page.getByText('Nigeria → Bolivia')).toBeVisible();
  await expect(page.getByRole('link', { name: /Send money/ })).toBeVisible();

  // The demo entry point must be explicitly labelled as a demo.
  await expect(page.getByRole('link', { name: /guided demo/i })).toBeVisible();

  // Guard against marketing claims creeping back in.
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toMatch(/\d+[,\d]*\+? (customers|users|transfers) /);
  expect(body).not.toMatch(/save up to|trusted by|join thousands/);
});

test('landing page states the network and that testnet is not real money', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Testnet assets are not redeemable for real bolivianos/i)).toBeVisible();
});

test('guided demo is clearly simulated and has no write controls', async ({ page }) => {
  await page.goto('/demo');

  await expect(page.getByText('Simulated')).toBeVisible();
  await expect(page.getByText(/Nothing here is real/i)).toBeVisible();
  await expect(page.getByText(/writes nothing to the database/i)).toBeVisible();

  // A demo control must never mutate a real transfer. The safest design is to
  // have no submit control at all — assert that.
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('button[type="submit"]')).toHaveCount(0);
});

test('demo states custody honestly', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText(/Two legs are custodial/i)).toBeVisible();
});

test('send flow is gated behind sign-in', async ({ page }) => {
  await page.goto('/send');

  // Either the Pollar config is still loading or the sign-in form is shown;
  // in neither case may an amount field be reachable.
  await expect(page.getByRole('heading', { name: 'Send money' })).toBeVisible();
  await expect(page.getByLabel('You send (NGN)')).toHaveCount(0);
});

test('activity requires sign-in and offers a route forward', async ({ page }) => {
  await page.goto('/activity');

  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.getByText(/Sign in to see your transfers/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
});

test('operator workspace refuses anonymous access', async ({ page }) => {
  await page.goto('/operator');

  await expect(page.getByText(/Sign in required/i)).toBeVisible();
  // No reconciliation control may render for an anonymous visitor.
  await expect(page.getByText(/Record reconciliation/i)).toHaveCount(0);
});

test('operator API rejects an unauthenticated write', async ({ request }) => {
  const res = await request.post('/api/operator/transfers/fake-id/verify-funding', {
    data: { bankReference: 'X1', receivedAmountNgn: '1.00', decision: 'VERIFIED' },
  });

  // Authority is enforced server-side, not by hiding the UI.
  expect([401, 403]).toContain(res.status());
});

test('transfer creation rejects an unauthenticated request', async ({ request }) => {
  const res = await request.post('/api/transfers', {
    data: { quoteId: 'x', idempotencyKey: 'abcdefgh', recipientName: 'Test', recipientFields: {} },
  });

  expect(res.status()).toBe(401);
});

test('quote endpoint rejects an unauthenticated request', async ({ request }) => {
  const res = await request.post('/api/quotes', { data: { sendAmountNgn: '250000.00' } });
  expect(res.status()).toBe(401);
});

test('wallet challenge rejects an invalid Stellar address', async ({ request }) => {
  const res = await request.post('/api/auth/challenge', { data: { address: 'not-an-address' } });

  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('BAD_ADDRESS');
});

test('primary actions meet the minimum touch target size', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('link', { name: /Send money/ }).locator('button');
  const box = await button.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('page does not scroll horizontally at mobile width', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
