# Proof of usage

Evidence is separated into three tiers. Nothing in a weaker tier is presented as
belonging to a stronger one. Every claim below was produced by a command in this
repository and can be reproduced.

| Tier | Meaning |
| --- | --- |
| **Simulated** | No external system was contacted. |
| **Testnet / sandbox** | A real SDK or provider call, against a test network. **Not redeemable for real money.** |
| **Live** | Real money moved. |

---

## Tier 3 — Live money

**None.** No real-money transfer has been performed. No pilot participants were
funded, and the development environment has never spent real funds.

This is the honest status. Any claim of a completed Nigeria→Bolivia money
transfer would be false.

---

## Tier 2 — Real SDK calls (testnet)

Reproduce with:

```bash
npm run verify:pollar
```

The script writes a timestamped record to `docs/evidence/`.

### Confirmed successful, live, authenticated call

`GET https://sdk.api.pollar.xyz/v2/applications/config` → **200**

```json
{ "content": { "application": { "name": "AfriPuente", "network": "testnet", "chains": ["STELLAR"] } } }
```

This is Pollar's real record of **this project's** application, on Stellar
testnet. It proves the SDK, the publishable key and the origin allowlist are all
correctly configured end to end.

### Confirmed: a complete authenticated session, end to end

Performed in the browser on 2026-09-17 against Stellar testnet:

| Step | Real Pollar call | Result |
| --- | --- | --- |
| Email OTP requested | `client.login({ provider: 'email', email })` | Code delivered to a real inbox |
| Code verified | `client.verifyEmailCode(code)` | `POST /auth/email/verify-code` → **success**, session established |
| Wallet provisioned | Pollar embedded wallet | **`GDCB6KB6DSDR7ML47FB25L6F73OVOCFYQHVQOVN7HTJWG3B2UZPBLOBQ`** |
| **Ownership proved** | `client.stellar.sep53.signMessage(nonce)` | Returned `status: 'signed'`, `scheme: 'sep53'` |
| Proof verified server-side | `verifyWalletProof()` — real ed25519 | **Accepted**; AfriPuente session cookie issued |
| Quote built | `POST /api/quotes` | ₦250,000 → 149.2424242 USDC → Bs 1,038.72 |

This is the full authentication path working against the live API — including the
SEP-53 ownership proof, which is what makes a wallet address an authenticated
identity rather than a client-supplied string. A wrong-code attempt was also
exercised and correctly rejected (`/auth/email/verify-code` → `400`).

### Confirmed SDK integration

| Evidence | Result |
| --- | --- |
| `@pollar/core` / `@pollar/react` installed | `0.11.3` / `0.11.3` |
| Real SDK symbols importable | `PollarClient`, `StellarClient`, `WalletType`, `toBaseUnits` + 47 more |
| `PollarClient` initialises in-browser | Console: `[PollarClient] Initialized v0.11.3 — endpoint: https://sdk.api.pollar.xyz/v2, network: testnet` |
| CORS preflight from the app origin | `204`, `Access-Control-Allow-Origin` echoes the origin |

### Confirmed: the ramp corridor is NOT available to this application

Run from `/diagnostics` under the authenticated session above:

```
GET /ramps/countries            -> 200, { "countries": [] }    0 countries, Bolivia ABSENT
BOB offramp quote @ 50 BOB      -> 200, 0 quotes
BOB offramp quote @ 100 BOB     -> 200, 0 quotes
BOB offramp quote @ 500 BOB     -> 200, 0 quotes
BOB offramp quote @ 1,000 BOB   -> 200, 0 quotes
BOB offramp quote @ 5,000 BOB   -> 200, 0 quotes
BOB offramp quote @ 10,000 BOB  -> 200, 0 quotes
```

These calls **succeed**. The session is valid and the endpoints return `200`.
There is no anchor enabled on this application to quote against — either no ramp
provider is configured for it, or ramps are mainnet-only. See
[`pollar-integration.md` §5](./pollar-integration.md) for the full analysis.

The application reports this state truthfully in the send flow rather than
falling back to an invented rate presented as real: the quote is labelled
**"Estimate only"**, and the notice reads *"Pollar returned no Bolivian off-ramp
quote. This application currently has no ramp anchors enabled."* The recipient
form is withheld entirely, because the provider never supplied its
`requiredFields`.

### Documented API behaviour, established by probing

| Probe | Result | Meaning |
| --- | --- | --- |
| Ramp endpoint + secret key | `403 API_KEY_TYPE_NOT_ALLOWED` | Ramp calls reject secret keys by type |
| Ramp endpoint + PAT | `403 API_KEY_TYPE_NOT_ALLOWED` | Same |
| Ramp endpoint + publishable key, unregistered origin | `403 ORIGIN_NOT_ALLOWED` | Origin allowlist enforced |
| Ramp endpoint + publishable key, registered origin | `401 SDK_AUTH_INVALID_TOKEN` | A user session is additionally required |
| `/ramps/countries` without `/v2` | `404` | `/v2` is the live prefix |

These negative results are real findings about the API, and they shaped the
architecture. They are not failures of the integration.

### Not yet observed

- A **non-empty** Bolivian (`BO`/`BOB`) off-ramp quote.
- The provider's actual `requiredFields[]` for Bolivia.
- A `POST /ramps/offramp` order.
- A Stellar settlement transaction hash.

These are no longer blocked by authentication — that gate has been passed. They
are blocked by this application having **no ramp anchors enabled**, which is an
account-level configuration matter outside this codebase.

---

## Verified end-to-end journey (live application, simulated money legs)

Executed against the running app on 2026-09-17, persisted to Neon Postgres.

### Transfer `APX-S6NE-C5RG` — the happy path

| Step | Result |
| --- | --- |
| Quote built | ₦120,000.00 → fee ₦1,800.00 → **71.6363636 USDC** → Bs 498.58 |
| Transfer created | Persisted, reference issued |
| Funding instructions | `NO ACCOUNT — SANDBOX MODE` + "do not send money" warning |
| Sender reports payment | `fundingStatus: REPORTED` — **not** verified |
| Operator reconciles ₦120,000.00 with bank ref `GTB/2026/09/17/554433` | `fundingStatus: VERIFIED` |
| Resulting settlement status | **`ASSET_DELIVERY_PENDING`** |

The last row is the important one: verifying that naira arrived did **not**
create an on-chain balance. Settlement moved only to "delivery pending", awaiting
independently verified on-chain delivery.

### Transfer `APX-D9RR-AKBC` — operator override refused

The operator entered ₦240,000.00 against an expected ₦250,000.00 while leaving
the dropdown on **"Matches the expected payment"**.

| Result | |
| --- | --- |
| Recorded status | **`MISMATCHED`** — the server overrode the operator's selection |
| Transfer state | `MANUAL_REVIEW` |
| Sender sees | *"We received an amount or reference that does not match this transfer. Our team is reviewing it. Your money is recorded and has not been lost."* |
| Repeat attempt | Refused — "Reconciliation cannot be repeated from here." |

Amounts decide the outcome, not the button that was pressed.

### Duplicate-payment and replay guards, exercised live

| Guard | Call | Result |
| --- | --- | --- |
| **Idempotent creation** | `POST /api/transfers` twice, same `idempotencyKey` | `201` then `200` with `reused: true` — **same transfer id**, no duplicate |
| **Quote reuse** | Third call, same quote, new key | `409 QUOTE_ALREADY_USED` |
| **Duplicate deposit** | Reconcile a second transfer with bank ref `GTB/2026/09/17/554433` | `409 BANK_REFERENCE_REUSED` |
| **Double reconciliation** | Reconcile an already-reconciled transfer | `409 ALREADY_VERIFIED` |
| **Session persistence** | Full page reload, then dev-server restart | Session and transfer state both survived |

### Session and authorisation

| Check | Result |
| --- | --- |
| Unauthenticated `POST /api/transfers` | `401` |
| Unauthenticated `POST /api/quotes` | `401` |
| Unauthenticated operator write | `401` |
| Invalid Stellar address at `/api/auth/challenge` | `400 BAD_ADDRESS` |
| Wrong email OTP | `400` from `/auth/email/verify-code`, surfaced in the UI |

---

## Tier 1 — Simulated

- The guided demo at `/demo` is fictional and read-only. It writes nothing to the
  database and cannot alter a real transfer.
- With `NGN_FUNDING_MODE=SIMULATED`, funding instructions display
  `NO ACCOUNT — SANDBOX MODE` with an explicit warning. No plausible-looking
  account number is ever shown.

---

## Automated test evidence

```bash
npm test
```

**53 tests across 4 files, all passing.**

| Suite | Tests | Kind |
| --- | --- | --- |
| `money.test.ts` | 17 | Pure arithmetic, no mocks |
| `quote.test.ts` | 13 | Pure logic, no mocks |
| `state.test.ts` | 15 | Pure logic, no mocks |
| `wallet-proof.test.ts` | 8 | **Real ed25519 signatures** via `@stellar/stellar-sdk` |

The wallet-proof suite is not mock-based: it generates real Stellar keypairs,
signs real SEP-53 digests, and asserts that a signature from a *different* wallet
is rejected.

Other verification:

```bash
npm run typecheck   # passes
npm run build       # passes — 12 routes
npm run db:push     # schema in sync on Neon Postgres
```

---

## What would make this stronger

In order of value:

1. **Enable a ramp provider on this Pollar application**, or obtain a mainnet key,
   so `/ramps/countries` returns Bolivia. Everything on the payout leg is blocked
   behind this single account-level step.
2. Fund the wallet `GDCB6KB6…UZPBLOBQ` on testnet, establish a USDC trustline, and
   record a real settlement transaction hash verified independently on Horizon.
3. Contract a Nigerian funding partner, enabling a `SANDBOX` or `LIVE` funding leg.
4. Run one small real-money pilot with consenting participants who authorise
   their own transactions.

Until each is done, the corresponding leg stays visibly pending in the UI and is
reported as such here.
