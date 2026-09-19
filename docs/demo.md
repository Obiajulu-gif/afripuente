# Three-minute submission demo

Production: https://afripuente.vercel.app

## Before recording

- Register the exact app origin in Pollar under Build → Domains.
- Keep NGN_FUNDING_MODE=SANDBOX. No bank payment is needed for this demo.
- Open /send, choose **Continue with Pollar**, use an enabled standard sign-in option, then **Continue to AfriPuente** to sign the wallet-ownership message.
- Use fictional recipient data. Keep OTPs and real account details out of the recording.
- Create a new transfer. Older records configured for real settlement cannot be advanced by the simulator.
- /demo remains a public read-only fallback if sign-in is unavailable.

## 0:00–0:25 — Problem and scope

> AfriPuente connects a Nigeria-to-Bolivia payment workflow with Pollar and Stellar. This recording demonstrates the full sandbox journey. A separate Pollar withdrawal flow is available for an already-funded wallet.

## 0:25–1:00 — Sign-in and quote

Show the standard Pollar sign-in screen, then the account after wallet proof. Enter 250000 under **Send payment** and continue. Show fees, the estimated BOB amount, and any current provider quote. Use fictional recipient data in provider-driven fields. If discovery fails, the labeled estimate still supports the sandbox.

> Nigerian conversion is indicative. A quote is evidence of pricing, not a completed payment. Pollar handles the exact asset and fees separately for real withdrawals.

## 1:00–1:50 — Complete the sandbox

Review and **Create transfer**. Click these six controls in order:

1. **Simulate bank payment**
2. **Simulate funding confirmation**
3. **Simulate asset delivery**
4. **Simulate Stellar settlement**
5. **Simulate payout processing**
6. **Simulate recipient payment**

Show the **Sandbox receipt**, refresh to demonstrate persistence, and show Activity's SIMULATED label.

> These are explicit simulations with an audit trail. No deposit, blockchain transaction or bank payout was made. The demo cannot advance a live transfer or fabricate a provider transaction hash.

## 1:50–2:30 — Real Pollar integration

Open /diagnostics and run the read-only checks. Show current countries and BOB quotes. Then open **Wallet withdrawal**, show the balance and native Pollar widget, and choose **Sell → Bolivia (BOB)** if available.

> Real withdrawals use the wallet's supported asset balance. Pollar collects provider details, handles identity checks and asks for authorization. Sandbox payments do not fund the wallet, and withdrawal orders are managed separately in Pollar.

For a no-money demo, stop at the quote/review screen. Do not authorize payment just to record the interface. If you independently choose to execute a real payout, use correct beneficiary details and funds you intend to spend; retain the order reference and wait for provider confirmation and bank receipt before claiming completion.

## 2:30–3:00 — Close

> The submission demonstrates standard Pollar sign-in, verified wallet ownership, provider discovery, a persistent sandbox payment journey and the native funded-wallet withdrawal entry. Full live naira-to-boliviano automation still needs a Nigerian collection/conversion partner and integrated payout reconciliation.

Submit the app link, GitHub repository, recording and public/brand/afripuente-submission.png. Use public/brand/afripuente-icon-1024.png if the form asks for a square logo.
