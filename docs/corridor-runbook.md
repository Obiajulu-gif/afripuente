# Corridor runbook — Nigeria (NGN) → Bolivia (BOB)

Operational procedure for both local-currency legs, and what an operator is
accountable for. This document is deliberately blunt about which parts are real.

## 1. Shape of the corridor

```
Sender (Lagos)                    AfriPuente                 Pollar / Stereum        Recipient (Santa Cruz)
      |                                |                            |                          |
      |  1. NGN bank transfer          |                            |                          |
      |------------------------------->|                            |                          |
      |     (to funding partner)       |                            |                          |
      |                                | 2. operator reconciles     |                          |
      |                                |    the bank statement      |                          |
      |                                |                            |                          |
      |  3. partner delivers USDC      |                            |                          |
      |<-------------------------------|                            |                          |
      |     to sender's wallet         |  verified on-chain         |                          |
      |                                |                            |                          |
      |  4. sender authorises payment  |                            |                          |
      |------------------------------->|--------------------------->|                          |
      |                                |   USDC on Stellar          |  5. BOB payout           |
      |                                |                            |------------------------->|
```

Legs 4 and 5 are Pollar's documented corridor. Legs 1–3 are AfriPuente's own,
and have **no automated provider**.

## 2. Custody — who holds what, honestly

| Stage | Who holds the value | Custodial? |
| --- | --- | --- |
| Sender's wallet | The sender, via Pollar | Non-custodial |
| NGN between bank transfer and USDC delivery | **The Nigerian funding partner** | **Custodial** |
| USDC in flight on Stellar | Nobody — it is on-chain | Non-custodial |
| USDC received by the ramp until BOB is paid | **Pollar's ramp partner (Stereum)** | **Custodial** |

It would be wrong to describe this corridor as non-custodial because the sender
controls their wallet. **Two legs are custodial.** AfriPuente itself never holds
customer money and never holds a private key.

## 3. The Nigerian leg (AfriPuente-owned)

### 3.1 Why it is semi-manual

Pollar's corridor table covers BR, CO, MX and BO. **Nigeria is not on it.** There
is no NGN on-ramp to call. Separately, a Nigerian bank *collection* API only
receives naira — it does not convert naira to a Stellar asset. Those are two
different services, and conflating them would be the single easiest way to build
something dishonest here.

So the leg is split into two independently tracked facts:

1. **Did naira arrive?** — proven by a bank statement, reconciled by an operator.
2. **Did USDC arrive in the sender's wallet?** — proven on-chain.

A cleared bank deposit never creates an on-chain balance in this system.

### 3.2 Modes

Set by `NGN_FUNDING_MODE`:

- **`SIMULATED`** (default) — the funding screen shows sandbox instructions that
  cannot be mistaken for a real account. There is no account number; the field
  literally reads `NO ACCOUNT — SANDBOX MODE` alongside a red warning. No
  plausible-looking account number is ever rendered.
- **`SANDBOX`** — a provider test environment, if one is available.
- **`LIVE`** — requires `NGN_PARTNER_NAME`, `NGN_PARTNER_BANK` and
  `NGN_PARTNER_ACCOUNT`. The app **refuses to boot** in LIVE mode without all
  three, so it can never show a blank "real" collection account.

### 3.3 Who supplies the Stellar liquidity

The funding partner that receives the naira is also the party that delivers USDC
to the sender's wallet. **No partner is contracted for this pilot.** That is the
honest position, and it is why the default mode is `SIMULATED`.

AfriPuente deliberately does **not** hold a treasury private key to make a demo
convenient. Partner signing stays under the partner's control. A treasury key in
the app would turn a hackathon demo into a custodial money service.

### 3.4 Operator procedure

1. A transfer appears in `/operator` once the sender reports payment
   (`fundingStatus = REPORTED`).
2. Open the bank statement **independently**. Do not rely on a screenshot, and do
   not rely on the sender's claim.
3. Find the credit matching the transfer's reference (format `APX-XXXX-XXXX`).
4. Enter the **bank's own reference**, the **exact amount received**, and a decision.
5. The server decides the outcome:
   - amount equals expected → `VERIFIED`
   - anything else → `MISMATCHED`, regardless of which option was chosen.
6. Every action is written to `AuditEvent` against the operator's user id.

The bank reference carries a **unique constraint**. The same real-world deposit
cannot be used to fund two transfers, because the second attempt fails at the
database.

## 4. Failure handling

| Situation | What the system does | What the operator does |
| --- | --- | --- |
| **Wrong/missing reference** | Deposit cannot be matched; transfer stays `AWAITING_FUNDING` | Search by amount and sender name; if found, reconcile against the correct transfer. Never reconcile a guess. |
| **Short or over payment** | Server forces `MISMATCHED`; transfer → `MANUAL_REVIEW` | Contact the sender: top up, or refund. Record the decision in notes. |
| **Duplicate deposit** | Second reconciliation rejected with `BANK_REFERENCE_REUSED` | Treat the extra deposit as a refund case. |
| **Quote expired before money arrived** | The funding record is **preserved**. The transfer is not discarded. | Issue a new quote at the current rate and have the sender accept it, or refund. The received funds record always survives. |
| **Insufficient partner liquidity** | Settlement stays `ASSET_DELIVERY_PENDING`; nothing is sent to Bolivia | Hold; if unresolved, refund the naira. Do not send a partial payout. |
| **Settlement confirmed but payout failed** | Transfer → `MANUAL_REVIEW`, never `FAILED` | The money left the wallet but the recipient was unpaid. Reconcile with the provider before any retry. |
| **Settlement timeout, later confirmation** | Status is reconciled by polling; the tx hash is unique | Never resubmit before checking whether the original succeeded. |
| **Recipient details rejected by provider** | Payout `FAILED` before settlement → transfer `FAILED` | Collect corrected details, re-quote. |

### Refunds

A refund is two states, not one: `REFUND_PENDING` then `REFUNDED`. The UI never
shows "refunded" while only a refund *request* exists — `REFUND_PENDING` renders
as `MANUAL_REVIEW`. Likewise a transfer can only show `CANCELLED` if nothing has
moved; cancelling something already in flight becomes `MANUAL_REVIEW`.

## 5. The Bolivian leg (Pollar)

Documented corridor: **Stereum, sell, BO, BOB, ACH rail, USDC on Stellar.**

1. Get a quote: `GET /ramps/quote?country=BO&currency=BOB&amount=…&direction=offramp`.
   Valid 15 minutes.
2. Render recipient fields from the quote's **`requiredFields[]`**. Do not
   hardcode a Bolivian bank form — the provider states what it needs.
3. Create the order: `POST /ramps/offramp`. The response carries `txId`,
   `kycRequired` / `kycUrl`, `pendingSignature` and `depositInstructions`.
4. **Resolve `depositInstructions` before sending anything.** The destination,
   and any memo, come from the provider. Guessing a destination loses the money.
5. If `pendingSignature` is present, the sender signs (`sep10` or
   `withdraw_payment`) and it is submitted via `submitRampSignature`.
6. Track the payout with `pollRampTransaction` / `getRampTransaction`. The
   on-chain confirmation and the fiat payout are **separate events**; only the
   provider's `completed` status completes the transfer.

If Pollar's team operates part of the Bolivian test by hand, that is recorded as
`MANUAL_HANDOFF` with an evidence note, and the UI says the payout was completed
manually. It is never presented as automated.

**Testnet assets are never redeemable for real BOB.** A testnet settlement proves
the Stellar leg works; it does not prove a payout.

## 6. Current pilot status

| Leg | Mode | Status |
| --- | --- | --- |
| NGN funding | `SIMULATED` | No partner contracted. Sandbox instructions only. |
| Asset delivery | `SIMULATED` | Depends on the funding partner above. |
| Stellar settlement | `TESTNET` | SDK wired; testnet only. |
| BOB payout | `SIMULATED` | Corridor documented and origin/key proven; **live quote not yet observed** — needs an authenticated user session. |

No leg is live. The application reports exactly this on every transfer.
