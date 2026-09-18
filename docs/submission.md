# AfriPuente — submission copy

**Local money. Connected continents.**

- App: https://afripuente.vercel.app
- Repository: https://github.com/Obiajulu-gif/afripuente
- Recording guide: [demo.md](demo.md)

## Problem

A Nigerian business wants to pay a Bolivian freelancer in local currency. AfriPuente models one traceable workflow joining naira funding to a Stellar wallet and Pollar's Bolivian quote discovery.

## Implemented

Pollar authentication, server-verified SEP-53 wallet proofs, wallet-bound permissions, exact monetary calculations, authenticated provider quote requests, provider-driven recipient fields, persistent transfers, sandbox funding reports, operator reconciliation, duplicate-deposit checks and separate funding/settlement/payout states. Public users can inspect a clearly simulated guided demo.

## Execution boundary

Stellar mainnet wallet configuration is enabled. Nigerian funding is sandbox. No real money was moved in verification. The project does not execute asset delivery, on-chain settlement, off-ramp orders or bank payouts. A provider quote demonstrates availability/pricing, not payment completion. Historical testnet evidence is retained and dated; current availability must be checked while signed in at /diagnostics.

## Next work

Secure a Nigerian collection/conversion arrangement; confirm provider settlement asset and quote semantics; implement and independently verify asset delivery and settlement; create and reconcile payout orders; implement failure/refund handling. A UBA account number supplies payment instructions, not these integrations.
