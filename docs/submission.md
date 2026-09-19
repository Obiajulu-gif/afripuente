# AfriPuente — submission copy

**Local money. Connected continents.**

- App: https://afripuente.vercel.app
- Repository: https://github.com/Obiajulu-gif/afripuente
- Recording guide: [demo.md](demo.md)

## Problem

A Nigerian business wants to pay a Bolivian freelancer in local currency. AfriPuente models one traceable workflow joining naira funding to a Stellar wallet and Pollar's Bolivian quote discovery.

## Implemented

Standard Pollar sign-in, server-verified SEP-53 wallet proofs, wallet-bound permissions, exact monetary calculations, authenticated provider quotes, provider-driven recipient fields, persistent transfers, a full sandbox journey through a simulated recipient receipt, operator reconciliation, duplicate-deposit checks and separate funding/settlement/payout states. A dedicated wallet withdrawal page opens Pollar's native buy/sell widget for a funded wallet. Public users can inspect a read-only guided demo.

## Execution boundary

Stellar mainnet wallet configuration is enabled. Nigerian funding and the corridor walkthrough are sandbox; simulation does not create wallet funds or bank payments. Real withdrawals are user-authorized inside the native Pollar widget and depend on supported balances, provider availability and identity checks. Those orders are managed by Pollar and do not update sandbox activity. No real payout was executed during automated verification. A quote or wallet transaction alone does not prove bank receipt. Historical testnet evidence remains dated; current availability can be checked at /diagnostics.

## Next work

Secure a Nigerian collection/conversion arrangement; independently verify asset delivery; connect native wallet orders to the corridor ledger with authoritative provider reconciliation; implement integrated failure/refund handling. A UBA account number supplies payment instructions, not these integrations.

## Artwork

- Logo: [afripuente-icon-1024.png](../public/brand/afripuente-icon-1024.png)
- Submission cover: [afripuente-submission.png](../public/brand/afripuente-submission.png)
