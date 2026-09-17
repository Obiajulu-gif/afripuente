# Pollar integration — verified capabilities

This document records what was **verified directly** against the installed Pollar packages and
the live Pollar API, versus what remains **unverified** or **blocked**. Nothing here is inferred
from the product marketing site.

| Field | Value |
| --- | --- |
| `@pollar/core` | `0.11.3` (published 2026-08-24, MIT, Node ≥ 20) |
| `@pollar/react` | `0.11.3` (peer: `@pollar/core@^0.11.3`, react ≥ 18) |
| API base URL | `https://sdk.api.pollar.xyz` (SDK appends `/v2`) |
| API key header | `x-pollar-api-key` |
| Stellar network | `testnet` (SDK default; `stellarNetwork` option) |
| Verified on | 2026-09-17 |

## Sources

- Pollar docs: <https://docs.pollar.xyz/docs>
- Ramp providers & corridors: <https://docs.pollar.xyz/docs/operator-guide/integrations/ramps>
- API keys: <https://docs.pollar.xyz/docs/getting-started/api-keys>
- Dashboard (domains/CORS): <https://docs.pollar.xyz/docs/operator-guide/dashboard-overview>
- `node_modules/@pollar/core/README.md` (44 KB) and `dist/index.d.ts` (generated OpenAPI `paths`)
- `node_modules/@pollar/react/README.md`

Method: the README and the shipped `.d.ts` were read directly, and the live API was probed with
the project's own testnet keys. Where a claim could not be confirmed by one of those two, it is
marked UNVERIFIED below.

---

## 1. Verified by reading the shipped type definitions

These are **real Pollar API methods**, confirmed present in `@pollar/core@0.11.3`'s type
declarations. They are not application-owned wrappers.

### Authentication

| Method | Notes |
| --- | --- |
| `new PollarClient({ apiKey, baseUrl?, stellarNetwork? })` | Client constructor |
| `client.login({ provider })` | `'google' \| 'github' \| 'email'`, or a wallet adapter `type` |
| `client.verifyEmailCode(code)` | Email OTP second step |
| `client.logout({ everywhere? })` | Revokes refresh-token family |
| `client.ready()` | Resolves after keypair init + session restore |
| `client.getAuthState()` / `onAuthStateChange(cb)` | State machine + subscription |
| `client.getUserProfile()` | PII, **memory-only**, never persisted |
| `client.listSessions()` / `revokeSession(familyId)` | Active sessions |

Every authenticated request is signed with **DPoP (RFC 9449)**, so a stolen bearer token is not
replayable without the per-session keypair.

### Stellar ownership proofs — this is how we authenticate a wallet

| Method | Returns |
| --- | --- |
| `client.stellar.sep53.signMessage(msg)` | `{ status:'signed', signature, signerAddress, scheme:'sep53' }` |
| `client.stellar.sep10.sign({ challengeXdr, homeDomains?, webAuthDomain? })` | `{ status:'signed', signedXdr, signerAddress }` |

`signature` is base64 ed25519 over the SEP-53 digest
`SHA-256("Stellar Signed Message:\n" + message)`. Per the README, external and custodial wallets
both return `scheme: 'sep53'`, so one verifier handles both.

> **Why this matters for AfriPuente.** The brief requires that a connected wallet address alone
> must not establish an authenticated server session. SEP-53 is a documented, real ownership
> proof: the server issues a nonce, the wallet signs it, the server verifies the ed25519
> signature against the claimed address. That is the mechanism this app uses.

### Payments and transactions

| Method | Notes |
| --- | --- |
| `client.sendPayment(params)` | Stellar member takes decimal `amount` + `asset` |
| `client.buildTx(op, params)` / `signTx(xdr)` / `submitTx(xdr)` | Granular path |
| `client.buildAndSignAndSubmitTx(...)` / `runTx(...)` | Composed path |
| `client.getTxStatus(hash)` | `'PENDING' \| 'SUCCESS' \| 'FAILED'` |
| `client.setTrustline({ code, issuer })` | Required before holding USDC |
| `client.refreshBalance()` / `getWalletBalance(pk, network?)` | Multichain |

> **Stellar precision note.** Stellar classic assets use **7 decimal places**, and the SDK's
> Stellar payment member takes a **decimal string** `amount` (e.g. `'1.5'`), *not* EVM-style
> base units. The Solana member is the one that takes integer base units. Do not carry an
> 18-decimal assumption across. `toBaseUnits` / `fromBaseUnits` are exported for the cases that
> need them.

> **Balance `null` is not zero.** Since 0.11.1, `WalletBalanceRecord.balance` and `.available`
> are `string | null`, where `null` means *that chain could not be read*. Rendering it as `0`
> would be a correctness bug and is explicitly called out in the SDK README.

### Ramps (SEP-24) — the Bolivian payout leg

Confirmed OpenAPI paths in `dist/index.d.ts`:

```
/ramps/countries   /ramps/quote      /ramps/liquidity   /ramps/kyc-status
/ramps/pix/decode  /ramps/onramp     /ramps/offramp
/ramps/transaction/{txId}   /ramps/transaction/{txId}/signature
/ramps/transaction/{txId}/complete
```

`GET /ramps/quote` query (exact, from `operations['getRampsQuote']`):

```ts
{ country: string; amount: number; currency: string; direction: 'onramp' | 'offramp' }
```

Each returned quote:

```ts
{
  quoteId: string; provider: string; fee: number; feeCurrency: string; rate: number;
  rail: 'SPEI' | 'PIX' | 'PSE' | 'ACH' | 'BREB' | 'QR';
  protocol: 'SEP-24' | 'REST';
  estimatedTime: string; recommended: boolean;
  requiredFields: { key; label; type: 'text'|'email'|'tel'|'select';
                    bankType?: 'CLABE'|'PIX'|'PSE'|'ACH'|'BREB';
                    options?; placeholder?; hint?; optional? }[];
  minAmount?: number; maxAmount?: number;
}
```

`POST /ramps/offramp` body (exact):

```ts
{
  quoteId: string; amount: number; currency: string; country: string;
  walletAddress?: string; email?: string; fullName?: string;
  bankDetails?: { type: 'CLABE'|'PIX'|'PSE'|'ACH'|'BREB'; value: string };
  taxId?: string; qrCode?: string; fields?: Record<string, string>;
}
```

`POST /ramps/offramp` response (exact):

```ts
{
  txId: string; provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  kycUrl?: string; kycRequired?: boolean; tosUrl?: string;
  anchorTransactionId?: string; stellarTxHash?: string;
  pendingSignature?: { unsignedXdr: string; action: 'sep10' | 'withdraw_payment' };
  depositInstructions?: { scannable?: { kind: 'pix'|'stellar'|'url'|'opaque'; payload; image; ... } };
}
```

**Two design consequences, both load-bearing:**

1. **Recipient fields must be rendered from `requiredFields`, not hardcoded.** The quote tells us
   what the Bolivian provider needs. The brief says "do not guess the destination"; this is how we
   comply. Hardcoding a Bolivian bank form would be a guess.
2. **`depositInstructions` and `pendingSignature` must be resolved before any funds move.** The
   off-ramp response is what tells us where to send the asset and what to sign. We never send
   first and reconcile later.

SDK wrappers over the above: `getRampsQuote`, `getRampCountries`, `createOnRamp`, `createOffRamp`,
`completeWithdraw`, `submitRampSignature`, `getRampTransaction`, `pollRampTransaction`.

### KYC

`getKycStatus(providerId?)`, `getKycProviders(country)`, `startKyc(body)`,
`resolveKyc(providerId, level?)`, `pollKycStatus(providerId, opts?)`.
`KycLevel = 'basic'|'intermediate'|'enhanced'`; `KycStatus = 'none'|'pending'|'approved'|'rejected'`;
`KycFlow = 'iframe'|'form'|'redirect'`.

### React bindings

`<PollarProvider client={{ apiKey, baseUrl?, stellarNetwork? }}>` and `usePollar()` →
`{ isAuthenticated, wallet, wallets, verified, configStatus, retryConfig, login, logout, getClient }`.
Requires `import '@pollar/react/styles.css'`. Client Components only — the SDK degrades to a
no-op and warns during SSR, so the provider is mounted in a `'use client'` boundary.

---

## 2. Verified by probing the live API

Probed on 2026-09-17 against `https://sdk.api.pollar.xyz` using this project's own testnet keys.

| Probe | Result | What it establishes |
| --- | --- | --- |
| `GET /ramps/countries` with **secret** key | `403 API_KEY_TYPE_NOT_ALLOWED` | Ramp endpoints reject secret keys by type |
| `GET /ramps/countries` with **PAT** | `403 API_KEY_TYPE_NOT_ALLOWED` | Same |
| `GET /ramps/countries` with **publishable** key, unregistered origin | `403 ORIGIN_NOT_ALLOWED` | Origin allowlist is enforced |
| `GET /ramps/countries` with **publishable** key, registered origin | `401 SDK_AUTH_INVALID_TOKEN` | Origin passes; a **user session** is still required |
| `GET /ramps/countries` (no `/v2` prefix) | `404` | Confirms `/v2` is the live prefix |
| **`GET /applications/config`, registered origin** | **`200`** | **Live, successful authenticated call — see below** |
| `OPTIONS` preflight, registered origin | `204`, `Access-Control-Allow-Origin` echoes the origin | Browser CORS is driven by the same allowlist |

### Confirmed-live app configuration

`GET /v2/applications/config` returns our real application record:

```json
{ "content": { "application": { "name": "AfriPuente", "network": "testnet", "chains": ["STELLAR"] } } }
```

This is a genuine authenticated response from Pollar for this project's own application id, on
Stellar testnet. It is the first end-to-end proof that the SDK, the key and the origin
configuration are correct.

**Conclusion:** ramp calls are *user-context* calls made with the **publishable** key from an
allowlisted browser origin, carrying a DPoP-signed user session. They are not server-to-server
calls made with the secret key. This shaped the architecture: the ramp quote/creation calls run in
the browser through the SDK under the user's own authenticated session, while our server holds the
authoritative transfer record and verifies every result independently.

> **Important subtlety.** A Node script that sets an `Origin` header is *not* a CORS test — CORS is
> enforced by the browser, not the server. During development a Node probe reported `401`
> (looking "allowed") while the browser was still failing with a missing
> `Access-Control-Allow-Origin`. Both must be checked. `scripts/verify-pollar.ts` checks the
> server side; the browser side is confirmed by loading the app and reading the console.

---

## 3. Corridor support — Nigeria → Bolivia

From the published corridor table at
<https://docs.pollar.xyz/docs/operator-guide/integrations/ramps>:

| Provider | Direction | Country | Currency | Rail | Asset |
| --- | --- | --- | --- | --- | --- |
| Stereum | **Sell** | **BO** | **BOB** | **ACH** | **USDC on Stellar** |
| Stereum | Buy | BO | BOB | QR | USDC on Stellar |
| Pix providers | Buy/Sell | BR | BRL | PIX | USDC on Stellar |
| — | Buy/Sell | CO | COP | BreB/PSE | USDC on Stellar |
| — | Buy/Sell | MX | MXN | SPEI | USDC on Stellar |

**The leg we need — sell USDC → BOB into a Bolivian bank account via Stereum on the ACH rail —
is a documented, supported corridor.** This is the single most important external dependency of
the product, and it exists.

**Nigeria is not in Pollar's corridor table.** There is no NGN on-ramp through Pollar. This is not
a gap in our implementation; it is the actual shape of the provider network. The NGN leg is
therefore an AfriPuente-owned adapter with a documented semi-manual partner flow — see
[`corridor-runbook.md`](./corridor-runbook.md). We never describe that leg as a Pollar integration.

---

## 4. Blocked / unverified

| Item | Status | Exact blocker |
| --- | --- | --- |
| Live `GET /ramps/countries` response | **BLOCKED** | `401 SDK_AUTH_INVALID_TOKEN` — needs an authenticated user session. Requires completing the email-OTP login in a browser; cannot be reproduced from a script. |
| Live BOB quote (`country=BO, currency=BOB`) | **BLOCKED** | Same user-session gate. The corridor is documented and the origin/key are proven correct, but **the live quote has not yet been observed**. |
| Exact `requiredFields` for Bolivia/Stereum | **UNVERIFIED** | Only observable from a live quote. This is why the recipient form is generated from the response rather than hardcoded. |
| Testnet vs mainnet ramp availability | **UNVERIFIED** | Real anchors may not operate on testnet. A testnet settlement proves the Stellar leg, **not** a redeemable BOB payout. |
| USDC issuer on Stellar testnet | **UNVERIFIED** | Must be read from the app's enabled assets (`refreshAssets()`), never hardcoded from a symbol match. |
| Webhook signature verification | **UNVERIFIED** | Docs mention webhooks in the deferred-flow guide; the signing scheme has not been confirmed. Until it is, status is reconciled by **polling**, which is confirmed to exist (`pollRampTransaction`). |

### Honest status of the integration

- The SDK is installed, initialised, and is the real dependency of the payment journey.
- The ramp contract is implemented against the **actual shipped types**, not invented fields.
- **No live ramp call has yet succeeded**, because of the origin allowlist above.
- Anything the app cannot prove is rendered as pending or blocked in the UI, and every leg
  carries its own independent execution mode (`simulated` / `sandbox` / `testnet` / `live` /
  `manually_verified`). A transfer is never labelled "live" because one of its legs was.
