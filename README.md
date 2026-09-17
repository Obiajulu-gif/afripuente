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
| BOB payout | `SIMULATED` | **Blocked: this Pollar application has no ramp anchors enabled.** |

**What is proven.** A complete authenticated session against the live Pollar API
on Stellar testnet — email OTP, an embedded wallet
(`GDCB6KB6DSDR7ML47FB25L6F73OVOCFYQHVQOVN7HTJWG3B2UZPBLOBQ`), and a **SEP-53
ownership proof** verified server-side with real ed25519 before any session
cookie is issued.

**What is blocked, and why.** With that valid session, `GET /ramps/countries`
returns **zero countries**, and every Bolivian quote returns **zero quotes**.
These calls *succeed* — there is simply no anchor enabled on this application to
quote against. Pollar's published corridor table does list Bolivia/BOB via
Stereum, but that is a Pollar capability; what a given application's enabled
anchors offer is a separate question, and the only authoritative answer is that
endpoint. The app asks, and reports the empty answer instead of substituting an
invented rate.

**No real money has moved.** Full evidence, including the negative results that
shaped the design, is in [`docs/proof-of-usage.md`](docs/proof-of-usage.md).
Run the checks yourself at `/diagnostics` once signed in.

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
    page.tsx                     Landing (dark "night" surface)
    demo/                        Simulated, read-only walkthrough
    diagnostics/                 Runs real ramp calls and prints raw responses
    (app)/                       Route group — adds NO url segment
      layout.tsx                 Sidebar + mobile nav shell (signed-in only)
      dashboard/                 Overview: balance, attention, recent transfers
      send/                      Send flow (amount -> recipient -> review)
      activity/                  All transfers, with filters and search
      transfers/[id]/            Transfer detail + timeline
      operator/                  Protected reconciliation queue
    api/
      auth/challenge             Issue single-use SEP-53 nonce
      auth/verify                Verify proof, open session
      auth/logout                Clear the server session
      quotes                     Build a quote (server recomputes every total)
      quotes/preview             PUBLIC estimate for the landing page
      transfers                  Create (idempotent) / list
      transfers/[id]/report-funding
      operator/transfers/[id]/verify-funding
  components/
    ui.tsx                       Buttons, cards, badges, fields, states
    brand.tsx                    Bridge mark, wordmark, route illustration
    app-shell/                   Sidebar, mobile nav, account menu
    dashboard/                   Wallet balance card
    transfers/transfer-list.tsx  Table on desktop, cards on mobile
    landing/                     Header and quote explorer
  lib/
    money.ts                     Decimal-safe money
    nav.ts                       Navigation model (server-safe)
    corridor/quote.ts            Quote construction
    corridor/state.ts            Status derivation, execution modes, timeline
    corridor/presentation.ts     Plain-language status labels and tones
    corridor/transfer-view.ts    Server-side view assembly + ownership check
    auth/wallet-proof.ts         SEP-53 verification (ed25519)
    auth/session.ts              Signed cookie; role re-read from DB every call
    pollar/ramp.ts               App-owned wrappers over real Pollar SDK methods
prisma/schema.prisma             Data model
scripts/verify-pollar.ts         Reproducible integration evidence
```

### Design system

Two surfaces, one brand. Tokens live in `src/app/globals.css`.

| | Landing (`[data-theme="night"]`) | Dashboard (`:root`) |
| --- | --- | --- |
| Background | `#080D19` | `#F5F7FB` |
| Surface | `#111B2E` | `#FFFFFF` |
| Primary | Mint `#62F0BC` with **dark** ink `#07121F` | same |
| Accent | Violet `#9187FF` | same |

Mint always carries dark ink (~11.8:1). Violet is an accent only — never a
button background with white text, which would fail contrast. Spacing is an 8px
scale, content is capped at 1200px on the landing page, and status is always
conveyed by text as well as tone.

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
| `DATABASE_URL` | Neon Postgres connection string. Keep `connection_limit=10&pool_timeout=20` — without it Prisma's small default pool is exhausted in dev (`P2024`) |
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
npm test          # 53 unit tests (8 use real ed25519 signatures)
npm run typecheck # passes
npm run lint      # passes
npm run build     # passes — 13 routes
npm run test:e2e  # 26 Playwright tests, desktop + mobile
```

Guards exercised against the running app, not just in tests: idempotent transfer
creation, quote reuse (`409`), duplicate bank deposit (`409`), repeat
reconciliation (`409`), and an operator's "matches" selection being overridden to
`MISMATCHED` when the amounts differ. Details in
[`docs/proof-of-usage.md`](docs/proof-of-usage.md).

## Deployment (Vercel)

The project deploys as a standard Next.js app. Nothing is written to the
deployment filesystem — accounts and transfers live in Postgres, because a
serverless filesystem is not a place to keep financial records.

1. **Import the repository** into Vercel. Framework preset: Next.js. Root
   directory: the repository root. No build command override is needed.
2. **Set environment variables** for each target (Production and Preview). Copy
   the names from [`.env.example`](.env.example).
   - `NEXT_PUBLIC_*` values are exposed to the browser. Only the publishable
     Pollar key, the base URL, the network and the site URL belong there.
   - `POLLAR_SECRET_KEY`, `POLLAR_PAT`, `SESSION_SECRET` and `DATABASE_URL` are
     **server-only**. Never prefix them with `NEXT_PUBLIC_`.
   - Use a *different* `SESSION_SECRET` per environment so a preview cookie is
     not valid in production.
3. **Register the deployed origin with Pollar**: dashboard.pollar.xyz →
   *Build → Domains*. Add the production domain and any preview domain you will
   test from. Without this, every SDK call fails `403 ORIGIN_NOT_ALLOWED`, which
   surfaces in the browser as a CORS error.
4. **Apply the schema** against the deployment's database once:
   `DATABASE_URL="…" npx prisma db push`.
5. **Keep the network honest.** Hosting the site must not silently switch to
   real money: `NEXT_PUBLIC_STELLAR_NETWORK` stays `testnet` unless a live
   corridor is actually available. The UI labels the network on the landing
   page, the dashboard and every transfer.

### Environment targets

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | the production domain | omit — falls back to `VERCEL_URL` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` until a live corridor exists | `testnet` |
| `SESSION_SECRET` | unique | different from production |
| `DATABASE_URL` | production database | a separate branch or database if available |

## Limitations

1. **No real money has moved.** No leg is live.
2. **No Nigerian funding partner is contracted**, so the NGN leg is simulated by
   default. The app shows sandbox instructions that cannot be mistaken for a real
   account, and refuses to run `LIVE` without real partner details.
3. **The Bolivian payout cannot run**: this Pollar application has no ramp anchors
   enabled, so `/ramps/countries` returns an empty list. Either no ramp provider
   is configured for the application, or ramps are mainnet-only — the accessible
   documentation states neither, so both remain hypotheses. This is an
   account-level blocker, not a code one.
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
