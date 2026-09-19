import { expect, test } from '@playwright/test';
import Decimal from 'decimal.js';

// End-to-end coverage of everything reachable without an authenticated Pollar
// session. The authenticated legs need a real email OTP and are verified
// manually — see docs/proof-of-usage.md. Runs on desktop and mobile viewports
// (see playwright.config.ts).

test('landing page states the product without inventing metrics', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Your money\./ })).toBeVisible();
  await expect(page.getByText(/Pay from Nigeria to Bolivia/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Send a payment/ }).first()).toBeVisible();

  // The demo entry point must be explicitly labelled as a demo.
  await expect(page.getByRole('link', { name: /Explore the demo/ }).first()).toBeVisible();

  // Guard against marketing claims creeping back in.
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toMatch(/\d[\d,]*\+? (customers|users|transfers) /);
  expect(body).not.toMatch(/save up to|trusted by|join thousands|instant delivery/);
});

test('landing page discloses the demo boundary even on mainnet', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/no real naira collection, settlement or bank payout is executed/i)).toBeVisible();
});

test('landing quote explorer prices a real amount and carries it into the send flow', async ({
  page,
}) => {
  await page.goto('/');

  const amount = page.locator('#landing-amount');
  await expect(amount).toBeVisible();
  await amount.fill('100000');

  // Server-computed: 1.5% of 100,000 = 1,500.00
  await expect(page.getByText('₦1,500.00')).toBeVisible({ timeout: 15_000 });

  // It must always be labelled an estimate — this endpoint never has a
  // provider quote behind it.
  await expect(page.getByText('Estimate', { exact: true })).toBeVisible();
  await expect(page.getByText(/not a guaranteed quote/i)).toBeVisible();

  const cta = page.getByRole('link', { name: /Send this payment/ });
  await expect(cta).toHaveAttribute('href', /\/send\?amount=100000/);
});

test('landing anchor navigation targets sections that exist', async ({ page }) => {
  await page.goto('/');

  for (const id of ['how-it-works', 'features', 'faq']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('every landing link points somewhere real', async ({ page }) => {
  // Fetches every internal route, each of which may compile on first hit.
  test.slow();
  await page.goto('/');

  const hrefs = await page.locator('a[href]').evaluateAll((as) =>
    as.map((a) => a.getAttribute('href') ?? ''),
  );

  const internal = [...new Set(hrefs.filter((h) => h.startsWith('/')))];
  for (const href of internal) {
    const res = await page.request.get(href);
    expect(res.status(), `${href} should not be a dead link`).toBeLessThan(400);
  }

  // Anchors must resolve to a real element on the page.
  const anchors = [...new Set(hrefs.filter((h) => h.startsWith('#')))];
  for (const a of anchors) {
    await expect(page.locator(a), `${a} should exist`).toHaveCount(1);
  }
});

test('guided demo is clearly simulated and has no write controls', async ({ page }) => {
  await page.goto('/demo');

  await expect(page.getByText('Simulated')).toBeVisible();
  await expect(page.getByText(/Nothing here is real/i)).toBeVisible();
  await expect(page.getByText(/writes nothing to the database/i)).toBeVisible();

  // A demo control must never mutate a real transfer; the safest design is to
  // have no submit control at all.
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('button[type="submit"]')).toHaveCount(0);
});

test('demo states custody honestly', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText(/Two legs are custodial/i)).toBeVisible();
});

test('send flow is gated behind sign-in', async ({ page }) => {
  await page.goto('/send');

  await expect(page.getByRole('heading', { name: 'Send money' })).toBeVisible();
  // No amount field may be reachable before signing in.
  await expect(page.getByLabel('You send (NGN)')).toHaveCount(0);
});

test('dashboard redirects an anonymous visitor to sign in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/send/);
});

test('activity requires sign-in and offers a route forward', async ({ page }) => {
  await page.goto('/activity');

  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.getByText(/You are not signed in/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
});

test('operator workspace refuses anonymous access', async ({ page }) => {
  await page.goto('/operator');

  await expect(page.getByText(/Sign in required/i)).toBeVisible();
  await expect(page.getByText(/Record reconciliation/i)).toHaveCount(0);
});

/* ---------------------------------------------------- server authorisation -- */

test('operator API rejects an unauthenticated write', async ({ request }) => {
  const res = await request.post('/api/operator/transfers/fake-id/verify-funding', {
    data: { bankReference: 'X1', receivedAmountNgn: '1.00', decision: 'VERIFIED' },
  });
  expect([401, 403]).toContain(res.status());
});

test('transfer creation rejects an unauthenticated request', async ({ request }) => {
  const res = await request.post('/api/transfers', {
    data: { quoteId: 'x', idempotencyKey: 'abcdefgh', recipientName: 'Test', recipientFields: {} },
  });
  expect(res.status()).toBe(401);
});

test('authenticated quote endpoint rejects an unauthenticated request', async ({ request }) => {
  const res = await request.post('/api/quotes', { data: { sendAmountNgn: '250000.00' } });
  expect(res.status()).toBe(401);
});

test('wallet challenge rejects an invalid Stellar address', async ({ request }) => {
  const res = await request.post('/api/auth/challenge', { data: { address: 'not-an-address' } });

  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('BAD_ADDRESS');
});

/* ------------------------------------------------------------ public quote -- */

test('public quote preview is unauthenticated, exact, and never guaranteed', async ({
  request,
}) => {
  const res = await request.get('/api/quotes/preview?amount=250000');
  expect(res.status()).toBe(200);

  const { data } = await res.json();
  expect(data.fundingFeeNgn).toBe('3750.00'); // 150 bps
  expect(data.settlementAmount).toBe('149.2424242'); // 7dp, rounded down
  expect(Number(data.receiveBob)).toBeGreaterThan(0);
  expect(data.receiveBob).toBe(new Decimal(data.settlementAmount).mul(data.payoutRate).toFixed(2, Decimal.ROUND_DOWN));
  // This endpoint attaches no provider quote, so it can never be guaranteed.
  expect(data.guaranteed).toBe(false);
});

test('public quote preview rejects a malformed amount', async ({ request }) => {
  const res = await request.get('/api/quotes/preview?amount=abc');
  expect(res.status()).toBe(400);
});

/* ------------------------------------------------------------ presentation -- */

test('primary actions meet the minimum touch target size', async ({ page }) => {
  await page.goto('/');
  const box = await page.getByRole('link', { name: /Send a payment/ }).first().boundingBox();

  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('no page-level horizontal scrolling on public pages', async ({ page }) => {
  test.slow();
  for (const path of ['/', '/demo', '/send', '/activity', '/withdraw']) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${path} should not scroll horizontally`).toBe(false);
  }
});

test('wallet withdrawal requires Pollar sign-in and discloses real funds', async ({ page }) => {
  await page.goto('/withdraw');
  await expect(page.getByRole('heading', { name: 'Withdraw from your wallet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Pollar withdrawal' })).toBeDisabled();
  await expect(page.getByText(/A sandbox NGN transfer does not fund this wallet/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Pollar', exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'Continue with Pollar', exact: true }).click();
  await expect(page.locator('.pollar-modal')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('pollar-standard-sign-in.png'), fullPage: true });
});

test('mobile menu opens, lists links, and closes on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile menu only renders below the md breakpoint');

  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Open menu/i });
  await toggle.click();

  const menu = page.locator('#mobile-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'How it works' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});
