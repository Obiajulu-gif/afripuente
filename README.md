# AfriPuente

**Local money. Connected continents.**

A Nigerian creative agency pays a Bolivian illustrator. The sender funds in naira
from a normal Nigerian bank account; value settles as USDC on Stellar through
Pollar; the recipient is paid bolivianos into a Bolivian bank account.

Built for the Pollar hackathon. Corridor: **Nigeria → Bolivia**.

---

## The problem

A Lagos agency owes a Santa Cruz illustrator Bs 1,000. Their options are a
correspondent bank transfer that is slow and expensive and often fails on
compliance, or asking a freelancer to open a crypto exchange account. Neither
party wants to hold crypto. They want naira in and bolivianos out.

Pollar already operates the hard half of that route: a documented
**USDC → BOB** off-ramp into Bolivian bank accounts. AfriPuente builds the
Nigerian half and joins them into one traceable payment.

## What actually works right now

This section is deliberately unflattering, because an honest MVP is the point.

| Leg | Execution mode | Status |
| --- | --- | --- |
| NGN funding | `SIMULATED` | No partner contracted. Sandbox instructions only. |
| Settlement asset delivery | `SIMULATED` | Depends on that partner. |
| Stellar settlement | `TESTNET` | SDK wired; testnet only. |
| BOB payout | `SIMULATED` | Corridor documented, key + origin proven live; **live quote not yet observed**. |

**No real money has moved.** What *is* proven is a real, authenticated Pollar
call returning this project's own application record:

```
GET /v2/applications/config -> 200
{"content":{"application":{"name":"AfriPuente","network":"testnet","chains":["STELLAR"]}}}
```

Full evidence, including the negative results that shaped the design, is in
[`docs/proof-of-usage.md`](docs/proof-of-usage.md).

## Design decisions that matter

- **A connected wallet address is not a login.** Sessions are opened only after a
  **SEP-53** signature over a server-issued, single-use nonce verifies against
  that address (`client.stellar.sep53.signMessage`). Verified server-side with
  real ed25519.
- **Three independent statuses**, not one. Funding, on-chain settlement and fiat
  payout each have their own status and their own execution mode. A transfer with
  a real testnet settlement and a simulated payout can never render as "live" —
  the roll-up reports the **weakest** leg.
- **A bank deposit never invents an on-chain balance.** Naira arriving and USDC
  arriving are separate facts, verified separately.
- **Complete means the recipient was paid.** A confirmed Stellar transaction is
  not a completed payout.
- **"I have paid" is a claim, not proof.** It moves funding to `REPORTED` only. An
  operator must independently reconcile the bank record.
- **Recipient fields come from the provider.** The form is generated from the
  quote's `requiredFields[]`. We do not guess Bolivian bank details.
- **Money is never a float.** Fiat is integer minor units; the Stellar amount is
  an exact 7dp decimal string. Conversions round *down* so a receive amount is
  never overstated.

## Architecture

```
src/
  app/
    page.tsx                     Landing
    send/                        Send flow (amount -> recipient -> review)
    transfers/[id]/              Transfer detail + timeline
    activity/                    The user's transfers
    operator/                    Protected reconciliation queue
    demo/                        Simulated, read-only walkthrough
    api/
      auth/challenge             Issue single-use SEP-53 nonce
      auth/verify                Verify proof, open session
      quotes                     Build a quote (server recomputes every total)
      transfers                  Create (idempotent) / list
      transfers/[id]/report-funding
      operator/transfers/[id]/verify-funding
  lib/
    money.ts                     Decimal-safe money
    corridor/quote.ts            Quote construction
    corridor/state.ts            Status derivation, execution modes, timeline
    corridor/transfer-view.ts    Server-side view assembly + ownership check
    auth/wallet-proof.ts         SEP-53 verification (ed25519)
    auth/session.ts              Signed cookie; role re-read from DB every call
    pollar/ramp.ts               App-owned wrappers over real Pollar SDK methods
prisma/schema.prisma             Data model
scripts/verify-pollar.ts         Reproducible integration evidence
```

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, Prisma +
Neon Postgres, Zod, `@pollar/core` + `@pollar/react` 0.11.3,
`@stellar/stellar-sdk`, Vitest, Playwright.

## Setup

Requires Node ≥ 20.9 and a Postgres database (Neon recommended).

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run db:push
npm run dev
```

### Pollar dashboard configuration

Two settings are mandatory, and both cause confusing failures if missed:

1. **API keys** — dashboard.pollar.xyz → *Build → API Keys → Generate*. You need
   the **publishable** key (`pub_testnet_…`). Ramp endpoints **reject** secret
   keys with `API_KEY_TYPE_NOT_ALLOWED`.
2. **Domains** — *Build → Domains*. Add your exact dev origin, e.g.
   `http://localhost:3000`. Without it every SDK call fails
   `403 ORIGIN_NOT_ALLOWED`, and in the browser as a CORS error.

Then:

```bash
npm run verify:pollar    # writes evidence to docs/evidence/
```

### Environment variables

See [`.env.example`](.env.example). Placeholders only — never commit real keys.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` | Browser SDK key; origin-locked |
| `POLLAR_SECRET_KEY` | Server-only; never sent to the browser |
| `POLLAR_APP_ID` | Pollar application id |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `STELLAR_HORIZON_URL` | For independent transaction verification |
| `SESSION_SECRET` | ≥ 32 chars; signs the session cookie |
| `NGN_FUNDING_MODE` | `SIMULATED` \| `SANDBOX` \| `LIVE` |
| `NGN_PARTNER_*` | Required only in `LIVE`; the app refuses to boot without them |
| `NGN_PER_USD_INDICATIVE` | Indicative funding rate (never "guaranteed") |
| `BOB_PER_USD_INDICATIVE` | Estimate used only until a provider quote exists |
| `NGN_FUNDING_FEE_BPS` | AfriPuente's NGN charge, basis points |
| `OPERATOR_EMAILS` | Operator allowlist, applied server-side |

## Verification

```bash
npm test          # 53 unit tests
npm run typecheck
npm run build
npm run test:e2e  # Playwright
```

## Limitations

1. **No real money has moved.** No leg is live.
2. **No Nigerian funding partner is contracted**, so the NGN leg is simulated by
   default. The app shows sandbox instructions that cannot be mistaken for a real
   account, and refuses to run `LIVE` without real partner details.
3. **The live Bolivian quote has not been observed** — it needs an authenticated
   Pollar user session (browser email-OTP login). The corridor is documented and
   the key/origin are proven, but the quote itself is unverified.
4. **Webhook signature verification is not implemented** — the signing scheme is
   not documented in what was accessible. Status is reconciled by polling, which
   is confirmed to exist (`pollRampTransaction`).
5. **The USDC issuer is not hardcoded** and must be read from the app's enabled
   assets. Symbol matching is not identity.
6. **Quote totals partly depend on client-relayed provider data**, because ramp
   endpoints reject the secret key and require the user's browser session. The
   server mitigates this by recomputing every total from raw provider fields and
   storing the raw payload, but it cannot independently re-fetch the quote.

## Documentation

- [`docs/pollar-integration.md`](docs/pollar-integration.md) — verified SDK capabilities, mapped to files
- [`docs/corridor-runbook.md`](docs/corridor-runbook.md) — both local-currency legs, operator duties, failure handling
- [`docs/demo.md`](docs/demo.md) — three-minute demonstration script
- [`docs/proof-of-usage.md`](docs/proof-of-usage.md) — simulated vs testnet vs live evidence
- [`docs/submission.md`](docs/submission.md) — hackathon submission
