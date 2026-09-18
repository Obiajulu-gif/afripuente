# AfriPuente

**Local money. Connected continents.** Nigeria → Bolivia payment-workflow MVP built with Pollar and Stellar.

## Current scope — September 18, 2026

The deployment uses **Stellar mainnet wallet configuration** with **sandbox Nigerian funding**. This is a hackathon MVP, not an operational remittance service.

| Stage | Implemented behavior |
| --- | --- |
| Identity | Pollar sign-in and server-verified SEP-53 wallet ownership |
| Quotes | Exact NGN fee arithmetic, indicative NGN conversion, authenticated Pollar BOB quote requests |
| Recipient | Provider-supplied fields, including bank selection |
| Funding | Sandbox instructions, sender report, operator reconciliation, duplicate-deposit protection |
| Settlement | Status model only; asset delivery and payment execution are not implemented |
| BOB payout | Quote discovery only; off-ramp order creation and payout execution are not implemented |

No real funds were moved during verification. Mainnet configuration does not establish that a transfer settled or a recipient was paid. Earlier evidence in docs/evidence is historical. A Stereum mainnet quote fixture was supplied with the preceding changes; run /diagnostics while signed in to establish current availability.

USDT provider fees are shown explicitly. USDC/USDT parity is used only for an estimate and raises a warning; the settlement asset must be confirmed before implementing payments. The total remains indicative.

## Run locally

Requires Node 20.9+ and PostgreSQL. This repository uses pnpm and pnpm-lock.yaml.

1. Run pnpm install.
2. Copy .env.example to .env.local and fill required values.
3. Supply DATABASE_URL in the command environment and run pnpm db:push. Prisma CLI does not read .env.local automatically. Do not use --accept-data-loss against an existing database without reviewing the changes.
4. Run pnpm dev. Next.js reads .env.local automatically.

## Configuration

Use [.env.example](.env.example). Real environment files are ignored by Git.

- NEXT_PUBLIC_STELLAR_NETWORK: mainnet or testnet. Both Pollar keys and STELLAR_HORIZON_URL must match.
- Mainnet Horizon: https://horizon.stellar.org; testnet: https://horizon-testnet.stellar.org.
- Pollar dashboard: register the exact origin under **Build → Domains**, including https://afripuente.vercel.app and your development origin.
- DATABASE_URL, SESSION_SECRET, POLLAR_SECRET_KEY and POLLAR_PAT are server-only. Never give them a NEXT_PUBLIC_ prefix.
- NGN_FUNDING_MODE=SANDBOX for submission. Leave NGN_PARTNER_NAME, NGN_PARTNER_BANK and NGN_PARTNER_ACCOUNT empty; the app supplies clearly labelled test instructions.
- NGN_PER_USD_INDICATIVE and BOB_PER_USD_INDICATIVE are operator-set estimates, not live FX feeds.
- OPERATOR_WALLETS contains comma-separated network:public-Stellar-address entries. Only explicitly listed, proven wallets can reconcile funding. Emails no longer grant privileges.

### Nigerian partner fields

These are receiving-account details, **not API keys**:

| Field | Value |
| --- | --- |
| NGN_PARTNER_NAME | Exact account-holder/beneficiary name |
| NGN_PARTNER_BANK | Receiving bank, for example UBA |
| NGN_PARTNER_ACCOUNT | Receiving account number |

Your UBA account can supply these details, but entering them only displays instructions. It does not create a bank integration, verify deposits, convert NGN into USDC or pay a Bolivian recipient. Get the exact details from your bank app, statement or bank representative. Before real collections, confirm the intended use with your bank/payment partner and implement collection, conversion, settlement and payout reconciliation. Do not change to LIVE merely to remove the demo label.

## Security boundaries

A signature proves a wallet, not browser-supplied user IDs or emails. Login recovers existing accounts through proven wallets or creates a server-derived identity. The v2 cookie invalidates old sessions: sign in again after this update. Operator permissions are bound to wallets in server configuration and checked on each operator action.

Quotes belong to one signed-in account and network. Expired, consumed and legacy unowned quotes must be refreshed. Monetary amounts use integer minor units or exact decimal strings. Funding, settlement and payout have separate states and modes. Sandbox reconciliation stays sandbox.

## Verify

Run pnpm test, pnpm typecheck, pnpm lint, pnpm build and pnpm test:e2e. Run pnpm verify:pollar for read-only provider probes.

Unit tests cover money, real wallet signatures, impersonation, permissions, network/key mismatches, funding modes and state derivation. Playwright covers public journeys, auth guards, desktop and mobile layouts. The provider probe reports blocked calls separately; it cannot replace browser OTP/DPoP verification.

## Deploy

Vercel project: afripuente. Production: https://afripuente.vercel.app.

Configure production variables, register the origin in Pollar, apply additive schema changes, run checks, push the reviewed commit and deploy with vercel deploy --prod. Smoke-test the production quote endpoint and sign-in flow. Use separate database/session settings for previews. Never commit environment files, .vercel or credentials.

## Demo and submission

- [Three-minute demo](docs/demo.md)
- [Submission copy](docs/submission.md)
- [Historical integration evidence](docs/proof-of-usage.md)
- [Corridor design/runbook](docs/corridor-runbook.md)

Remaining live-money work: a Nigerian collection/conversion arrangement, independently verified asset delivery, authoritative provider quote/asset validation, off-ramp ordering, user-authorised settlement, payout reconciliation and failure/refund handling.
