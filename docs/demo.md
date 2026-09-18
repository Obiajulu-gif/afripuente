# Three-minute submission demo

Production: https://afripuente.vercel.app

## Before recording

- Register the production origin in Pollar under Build → Domains.
- Keep NGN_FUNDING_MODE=SANDBOX. Do not pay a real bank account during the demo.
- Sign in with Pollar and complete the SEP-53 ownership signature. This update requires one fresh app sign-in. Your configured operator wallet can then open /operator.
- Run /diagnostics while signed in. Show the actual response; provider availability can change. Do not repeat the old testnet claim that no anchors exist if mainnet returns quotes.
- Keep /demo open as a read-only fallback if OTP/provider access is unavailable.
- Use a fictional recipient. Keep OTPs, credentials and real bank details out of the recording.

## 0:00–0:25 — Problem and scope

Show the landing page:

> AfriPuente explores payments from Nigeria to Bolivia: naira funding, Stellar settlement, and boliviano payout. The wallet is configured for mainnet; this MVP demonstrates sandbox funding and reconciliation. No real money moves in this demo.

## 0:25–1:00 — Quote

Enter 250000 in the quote explorer. Show the funding fee and estimated BOB amount, then click **Send this payment**. Sign in beforehand to save recording time.

> The server calculates monetary amounts precisely. The Nigerian conversion rate is indicative. Signed-in users can request a current Pollar payout-provider rate, but the overall total remains an estimate.

Continue to recipient details. If a quote is available, show the provider, fee currency and generated fields, then fill mandatory fields with demo values. If no quote is returned, show the notice and use the sandbox path. Do not invent a response.

## 1:00–1:35 — Real SDK evidence

Open /diagnostics and click **Run corridor checks**.

> These are real read-only Pollar SDK requests under my authenticated session. They show the countries and Bolivian quotes available to this application today.

If USDT fees appear, explain that USDC arithmetic is only an estimate until asset compatibility is confirmed. A quote is not a payout order or proof of settlement.

## 1:35–2:15 — Transfer and sandbox funding

Return to /send, complete the recipient step, review and create the transfer. Show its reference, sandbox warning and separate status timeline.

Use **I have made the bank transfer** only as a sandbox demonstration:

> This records the sender's claim. It does not prove a deposit or create a wallet balance.

Open /operator with your authorised wallet. Enter a unique demo bank reference such as DEMO-20260918-001 and exactly the quoted NGN amount. Record reconciliation. Explain that a real workflow would require independently checking an actual bank record. Use a new reference for each demo.

## 2:15–2:45 — Honest result

Refresh the transfer. Funding can be verified within the sandbox; settlement remains pending and payout has not started.

> The database retains the record and audit trail. Reconciliation preserves sandbox mode. The transfer is not completed: asset delivery, settlement and bank-payout execution still need implementation.

If sign-in or operator access is unavailable, show /demo instead. Do not describe its example stages as actual transactions.

## 2:45–3:00 — Close

> The MVP demonstrates authenticated wallet ownership, provider quote discovery, precise pricing and traceable funding reconciliation. Next are a Nigerian collection/conversion partner and verified settlement and payout execution.

Submit the app link, GitHub repository, recording and this scope. Do not claim a completed live NGN-to-BOB payment.
