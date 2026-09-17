# AfriPuente — Pollar hackathon submission

**Local money. Connected continents.**
Corridor: **Nigeria (NGN) → Bolivia (BOB)**

## Pitch

A Lagos creative agency owes a Santa Cruz illustrator a thousand bolivianos.
Correspondent banking is slow, expensive and fails on compliance; the alternative
is asking a freelancer to open a crypto exchange account. Neither party wants to
hold crypto. They want naira in and bolivianos out.

Pollar already operates the hard half of that route: a documented **USDC → BOB**
off-ramp paying into Bolivian bank accounts. AfriPuente builds the Nigerian half
and joins them into a single payment whose every stage is traceable — and whose
every claim is checkable.

## Why this corridor

Nigeria is a large freelance-export economy with constrained outbound payment
rails. Bolivia is served by Pollar's Stereum corridor but is rarely a destination
in African remittance products. The pairing is unusual, real, and entirely
dependent on the piece Pollar already provides.

## Feature summary

- **Send flow** — amount, provider-driven recipient fields, quote review, funding, authorisation.
- **Quote engine** — decimal-safe, showing every charge, expiry, and whether a provider guarantees it.
- **Transfer timeline** — plain language, persistent, with three independent leg statuses.
- **Activity** — the user's transfers with real empty and error states.
- **Operator workspace** — protected reconciliation queue; every action authorised and audited server-side.
- **Guided demo** — fictional, read-only, cannot touch real transfers.

## Stellar and Pollar integration

**Running on Stellar:** settlement is USDC on Stellar; `stellarNetwork` is
configured on the Pollar client; the app is built to verify transactions
independently on Horizon.

**Pollar SDK is in the payment path, not just in `package.json`:**

| Purpose | Real Pollar API used |
| --- | --- |
| Authentication | `client.login({ provider: 'email' })`, `verifyEmailCode` (DPoP, RFC 9449) |
| **Wallet ownership proof** | `client.stellar.sep53.signMessage()` |
| Bolivian quote | `client.getRampsQuote({ country:'BO', currency:'BOB', direction:'offramp' })` |
| Corridor check | `client.getRampCountries()` |
| Payout order | `client.createOffRamp()` |
| Payout tracking | `client.pollRampTransaction()` / `getRampTransaction()` |
| Settlement | `client.sendPayment()` / `buildTx` → `signTx` → `submitTx` |

The SEP-53 call is load-bearing: it is what makes a wallet address an
authenticated identity instead of a string the client typed.

Application-owned wrappers live in `src/lib/pollar/ramp.ts` and each names the
Pollar method it calls, so the boundary between our code and Pollar's API is
never blurred.

## Implementation status — honest

| Leg | Mode | Status |
| --- | --- | --- |
| NGN funding | `SIMULATED` | No partner contracted; sandbox instructions only |
| Asset delivery | `SIMULATED` | Depends on that partner |
| Stellar settlement | `TESTNET` | SDK wired; testnet only |
| BOB payout | `SIMULATED` | Corridor documented, key + origin proven live; live quote not yet observed |

**No real money has moved.** The strongest evidence is a real authenticated
Pollar response for this project's own application:

```
GET /v2/applications/config -> 200
{"content":{"application":{"name":"AfriPuente","network":"testnet","chains":["STELLAR"]}}}
```

Verified by test: **53 unit tests passing**, including 8 that exercise real
ed25519 SEP-53 signatures rather than mocks. Typecheck, production build and the
Neon schema push all pass.

## Remaining blockers, precisely

1. **Authenticated Pollar user session.** Ramp endpoints return
   `401 SDK_AUTH_INVALID_TOKEN` without one; the publishable key alone is not
   enough. Needs the browser email-OTP login completed. Blocks the live Bolivian
   quote, the real `requiredFields`, and any off-ramp order.
2. **No Nigerian funding partner.** Nigeria is absent from Pollar's corridor
   table, so this leg needs a commercial partner who both receives naira and
   delivers USDC. None is contracted, so the leg stays simulated.
3. **Webhook signature scheme undocumented** in what was accessible. Status is
   reconciled by polling instead, which is confirmed to exist.
4. **USDC issuer on testnet** must be read from the app's enabled assets; it is
   deliberately not hardcoded from a symbol match.

## Custody

| Stage | Holder | Custodial? |
| --- | --- | --- |
| Sender's wallet | The sender, via Pollar | No |
| NGN awaiting conversion | Nigerian funding partner | **Yes** |
| USDC in flight | On-chain | No |
| USDC until BOB is paid | Pollar's ramp partner | **Yes** |

Calling this corridor non-custodial because the sender holds their own wallet
would be wrong. Two legs are custodial. AfriPuente holds no customer money and no
private keys, and deliberately does not store a treasury key.

## Scope

Deliberately excluded: additional countries, reverse transfers, yield, x402,
escrow, custom smart contracts. The complete payment journey and truthful status
tracking were prioritised over feature count.

## Links

- Setup and limitations: [`README.md`](../README.md)
- Verified SDK capabilities: [`docs/pollar-integration.md`](./pollar-integration.md)
- Operations: [`docs/corridor-runbook.md`](./corridor-runbook.md)
- Evidence: [`docs/proof-of-usage.md`](./proof-of-usage.md)
- Demo script: [`docs/demo.md`](./demo.md)
