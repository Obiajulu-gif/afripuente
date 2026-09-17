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

### Confirmed SDK integration

| Evidence | Result |
| --- | --- |
| `@pollar/core` / `@pollar/react` installed | `0.11.3` / `0.11.3` |
| Real SDK symbols importable | `PollarClient`, `StellarClient`, `WalletType`, `toBaseUnits` + 47 more |
| `PollarClient` initialises in-browser | Console: `[PollarClient] Initialized v0.11.3 — endpoint: https://sdk.api.pollar.xyz/v2, network: testnet` |
| CORS preflight from the app origin | `204`, `Access-Control-Allow-Origin` echoes the origin |

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

- A live Bolivian (`BO`/`BOB`) off-ramp **quote**.
- The provider's actual `requiredFields[]` for Bolivia.
- A `POST /ramps/offramp` order.
- A Stellar settlement transaction hash.

All four are gated behind an authenticated Pollar **user session**, which
requires completing the email-OTP login in a browser. That gate is honest and
documented, not worked around.

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

1. Complete the email-OTP login and capture a live Bolivian quote with its real
   `requiredFields`.
2. Fund a Stellar testnet wallet, establish a USDC trustline, and record a real
   settlement transaction hash verified independently on Horizon.
3. Contract a Nigerian funding partner, enabling a `SANDBOX` or `LIVE` funding leg.
4. Run one small real-money pilot with consenting participants who authorise
   their own transactions.

Until each is done, the corresponding leg stays visibly pending in the UI and is
reported as such here.
