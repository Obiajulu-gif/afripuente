# Three-minute demonstration script

**Setup before recording**

```bash
npm run db:push && npm run dev
```

Have ready: the app at `http://localhost:3000` (or whichever origin is registered
under *Build → Domains*), a terminal, and a second browser profile signed in as
an operator (an address in `OPERATOR_EMAILS`).

> Use the origin you registered with Pollar. A mismatch fails as a CORS error and
> will derail the recording.

---

## 0:00 — The problem (20s)

> "A creative agency in Lagos owes a Bolivian illustrator about a thousand
> bolivianos. A correspondent bank transfer is slow and expensive. The
> alternative is asking a freelancer to open a crypto exchange account. Neither
> party wants crypto — they want naira in and bolivianos out."

**Show:** the landing page.

> "Pollar already runs the hard half: a documented USDC-to-boliviano off-ramp into
> Bolivian bank accounts. AfriPuente builds the Nigerian half and joins them."

---

## 0:20 — Quote and funding (45s)

**Do:** click *Send money*, sign in with the email code, then approve the wallet
ownership prompt.

> "A connected wallet address isn't a login. Our server issues a one-time nonce,
> the wallet signs it with SEP-53 through Pollar, and the server verifies that
> ed25519 signature before opening a session."

**Do:** enter `250000` and continue.

**Show:** the quote breakdown.

> "Every charge is visible: what you send, our funding charge, what settles on
> Stellar, and what the recipient receives. Note the badge — this says *estimate
> only*, not guaranteed, because the Nigerian leg has no provider quote behind it.
> The app never claims a rate it cannot back."

---

## 1:05 — The genuine Pollar interaction (40s)

**Show:** the recipient form.

> "These fields aren't a Bolivian bank form I invented. They come from
> `requiredFields` on Pollar's own quote — the provider tells us what it needs.
> If Pollar hasn't returned them, the app says so rather than guessing."

**Do:** switch to the terminal.

```bash
npm run verify:pollar
```

> "This is a real authenticated call to Pollar returning our own application
> record — name AfriPuente, network testnet, chain Stellar. It also shows the
> negative results that shaped the design: ramp endpoints reject the secret key
> by type, and require a user session, not just an API key."

---

## 1:45 — Funding and operator reconciliation (45s)

**Do:** create the transfer, land on the detail page.

**Show:** the funding instructions.

> "In simulated mode there is no account number — it reads 'NO ACCOUNT, SANDBOX
> MODE' with a warning. We never render a plausible-looking account someone might
> actually pay."

**Do:** click *I have made the bank transfer*.

> "That's a claim, not proof. It moves funding to 'reported' and nothing else."

**Do:** switch to the operator window, open `/operator`.

> "An operator checks the bank statement independently, and enters the bank's own
> reference and the exact amount. If the amount doesn't match, the server records
> a mismatch regardless of which button was pressed. And that bank reference is
> unique in the database — the same deposit can never fund two transfers."

**Do:** reconcile it.

---

## 2:30 — The timeline and honest status (30s)

**Do:** return to the transfer detail page and refresh.

> "Refreshing doesn't restart anything — the state lives in Postgres."

**Show:** the timeline and the banner.

> "Four plain-language steps. And this banner is the part I'd point at: it says
> *not a live transfer*, because the roll-up reports the weakest leg, not the
> strongest. Settlement is on testnet and the payout is simulated, so the transfer
> is not live — even though one leg is real."

**Do:** expand *Technical detail*.

> "Each leg carries its own status and its own execution mode. And a transfer only
> reads 'completed' when the payout provider confirms the recipient was paid —
> a confirmed Stellar transaction is not a completed payout."

---

## 2:55 — Close (15s)

> "Nigeria to Bolivia, with every stage traceable and nothing overstated. No real
> money has moved yet: there's no Nigerian funding partner contracted, and the
> live Bolivian quote needs an authenticated session we haven't completed. Both
> are documented as blockers rather than papered over."

---

## Ground rules while recording

- Do not describe testnet evidence as a real transfer.
- Do not call the corridor non-custodial — two legs are custodial.
- If a step fails, show the failure. The failure states are part of the product.
