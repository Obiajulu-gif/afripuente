'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePollar } from '@pollar/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge, Button, Card, Details, Field, Input, Notice, Row, Select } from '@/components/ui';
import { SignInPanel } from '@/components/sign-in-panel';
import { fetchBoliviaOfframpQuotes, type RampQuoteView, type RequiredField } from '@/lib/pollar/ramp';

type Step = 'amount' | 'recipient' | 'review';

interface QuoteResponse {
  id: string;
  sendAmountMinor: string;
  fundingFeeMinor: string;
  settlementAmount: string;
  payoutAmountMinor: string;
  payoutFeeMinor: string;
  payoutRate: string;
  ngnToAssetRate: string;
  guaranteed: boolean;
  payoutRateSource: 'provider' | 'indicative';
  provider?: string;
  providerRail?: string;
  expiresAt: string;
  warnings: string[];
}

function ngn(minor: string) {
  const v = (Number(minor) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  return `₦${v}`;
}
function bob(minor: string) {
  const v = (Number(minor) / 100).toLocaleString('en-BO', { minimumFractionDigits: 2 });
  return `Bs ${v}`;
}

/**
 * `signedIn` is resolved on the server by the page that renders this, so a
 * returning user with a valid session cookie is never asked to re-sign the
 * ownership proof after a reload.
 */
export function SendFlow({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { getClient } = usePollar();

  const [step, setStep] = useState<Step>('amount');

  const [amount, setAmount] = useState('250000');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [rampQuote, setRampQuote] = useState<RampQuoteView | null>(null);
  const [rampBlocked, setRampBlocked] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable across retries so a double submit, or a retry after a timeout, can
  // never create a second transfer. Generated lazily in the submit handler
  // rather than during render, because randomness during render is impure.
  const idempotencyKeyRef = useRef<string | null>(null);

  const requestQuote = useCallback(async () => {
    setBusy(true);
    setError(null);
    setRampBlocked(null);

    try {
      // 1. Indicative server quote first — this works with no provider at all,
      //    and gives us a BOB figure to ask Pollar about.
      const firstRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sendAmountNgn: Number(amount).toFixed(2) }),
      });
      const firstJson = await firstRes.json();
      if (!firstRes.ok) {
        setError(firstJson.message ?? 'Could not build a quote.');
        return;
      }
      const indicative: QuoteResponse = firstJson.data;

      // 2. Ask Pollar for a real Bolivian off-ramp quote for that BOB amount.
      const payoutBob = Number(indicative.payoutAmountMinor) / 100;
      const ramp = await fetchBoliviaOfframpQuotes(getClient(), payoutBob);

      if (!ramp.ok) {
        // Blocked is shown honestly; the estimate remains usable but is
        // clearly labelled as not guaranteed.
        setRampBlocked(ramp.message);
        setQuote(indicative);
        setRampQuote(null);
        setStep('recipient');
        return;
      }

      const best = ramp.data.find((q) => q.recommended) ?? ramp.data[0];
      if (!best) {
        // An empty list is not proof that the amount was the problem. It is
        // also what you get when the application has no ramp anchors enabled.
        // Do not assert a cause we have not established.
        setRampBlocked(
          'Pollar returned no Bolivian off-ramp quote. This application currently has no ramp anchors enabled, so no provider rate is available.',
        );
        setQuote(indicative);
        setStep('recipient');
        return;
      }

      // 3. Re-quote on the server WITH the provider quote, so every total is
      //    recomputed server-side from the provider's raw numbers.
      const finalRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sendAmountNgn: Number(amount).toFixed(2),
          providerQuote: {
            quoteId: best.quoteId,
            provider: best.provider,
            fee: best.fee,
            feeCurrency: best.feeCurrency,
            rate: best.rate,
            rail: best.rail,
            protocol: best.protocol,
            estimatedTime: best.estimatedTime ?? '',
            recommended: best.recommended,
            minAmount: best.minAmount,
            maxAmount: best.maxAmount,
          },
        }),
      });
      const finalJson = await finalRes.json();
      if (!finalRes.ok) {
        setError(finalJson.message ?? 'Could not price the Bolivian payout.');
        return;
      }

      setQuote(finalJson.data);
      setRampQuote(best);
      setStep('recipient');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [amount, getClient]);

  const createTransfer = useCallback(async () => {
    if (!quote) return;
    setBusy(true);
    setError(null);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          idempotencyKey: idempotencyKeyRef.current,
          recipientName,
          recipientFields: fields,
          accountFieldKey: rampQuote?.requiredFields?.find((f) => f.bankType)?.key,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? 'Could not create the transfer.');
        return;
      }
      router.push(`/transfers/${json.data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [quote, recipientName, fields, rampQuote, router]);

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <BackLink />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Send money</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          Sign in to start. Nigeria → Bolivia.
        </p>
        {/* router.refresh() re-runs the server component, which re-reads the
            session cookie the verify call just set. */}
        <SignInPanel onSignedIn={() => router.refresh()} />
      </main>
    );
  }

  // Provider-driven recipient fields. We never invent a Bolivian bank form —
  // if Pollar gave us requiredFields we render exactly those.
  const requiredFields: RequiredField[] = rampQuote?.requiredFields ?? [];

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <BackLink />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Send money</h1>

      <ol className="mb-6 flex gap-2 text-xs" aria-label="Progress">
        {(['amount', 'recipient', 'review'] as Step[]).map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={
                step === s
                  ? 'rounded-full bg-[var(--teal)] px-2.5 py-1 text-white'
                  : 'rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[var(--muted)]'
              }
            >
              {i + 1}. {s === 'amount' ? 'Amount' : s === 'recipient' ? 'Recipient' : 'Review'}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-4">
          <Notice tone="danger" title="Something went wrong">{error}</Notice>
        </div>
      )}

      {step === 'amount' && (
        <Card className="space-y-4">
          <Field
            label="You send (NGN)"
            htmlFor="amount"
            hint="Naira from your Nigerian bank account."
          >
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Button size="lg" onClick={requestQuote} disabled={busy || !Number(amount)}>
            {busy && <Loader2 className="animate-spin" size={16} aria-hidden />}
            {busy ? 'Getting a quote…' : 'Continue'}
          </Button>
        </Card>
      )}

      {step === 'recipient' && quote && (
        <div className="space-y-4">
          <QuoteCard quote={quote} rampBlocked={rampBlocked} />

          <Card className="space-y-4">
            <h2 className="text-sm font-semibold">Who is being paid?</h2>

            <Field label="Recipient full name" htmlFor="rname">
              <Input
                id="rname"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Valentina Quispe"
              />
            </Field>

            {requiredFields.length === 0 ? (
              <Notice tone="pending" title="Recipient details not yet available">
                Pollar has not returned the Bolivian provider&apos;s required fields for this
                quote, so we cannot show the correct form. We will not guess which bank details
                the provider needs. You can still create the transfer and add recipient details
                once the provider quote is available.
              </Notice>
            ) : (
              requiredFields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint}>
                  {f.type === 'select' && f.options ? (
                    <Select
                      id={f.key}
                      value={fields[f.key] ?? ''}
                      onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text'}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ''}
                      onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  )}
                </Field>
              ))
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('amount')}>
                Back
              </Button>
              <Button onClick={() => setStep('review')} disabled={recipientName.trim().length < 2}>
                Review
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 'review' && quote && (
        <div className="space-y-4">
          <QuoteCard quote={quote} rampBlocked={rampBlocked} />

          <Card className="space-y-3">
            <h2 className="text-sm font-semibold">Recipient</h2>
            <Row label="Name" value={recipientName} />
            {Object.entries(fields).map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
          </Card>

          <Notice tone="pending" title="What happens next">
            We give you a bank reference. You make a normal naira transfer using it. An operator
            checks the bank record before anything moves. Nothing is sent to Bolivia until that
            check passes.
          </Notice>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('recipient')}>
              Back
            </Button>
            <Button size="lg" onClick={createTransfer} disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={16} aria-hidden />}
              {busy ? 'Creating…' : 'Create transfer'}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function QuoteCard({ quote, rampBlocked }: { quote: QuoteResponse; rampBlocked: string | null }) {
  return (
    <Card className="space-y-1">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Quote</h2>
        <Badge tone={quote.guaranteed ? 'success' : 'pending'}>
          {quote.guaranteed ? 'Guaranteed by provider' : 'Estimate only'}
        </Badge>
      </div>

      <Row label="You send" value={ngn(quote.sendAmountMinor)} />
      <Row label="Our funding charge" value={ngn(quote.fundingFeeMinor)} />
      <Row label="Settles on Stellar as" value={`${quote.settlementAmount} USDC`} />
      {Number(quote.payoutFeeMinor) > 0 && (
        <Row label="Payout charge" value={bob(quote.payoutFeeMinor)} />
      )}
      <div className="mt-2 border-t border-[var(--border)] pt-2">
        <Row label="Recipient receives" value={<strong>{bob(quote.payoutAmountMinor)}</strong>} />
      </div>
      <p className="pt-2 text-xs text-[var(--muted)]">
        Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.
      </p>

      {rampBlocked && (
        <div className="pt-3">
          <Notice tone="pending" title="Live Bolivian rate unavailable">
            {rampBlocked} The figure above uses our indicative rate and is not guaranteed.
          </Notice>
        </div>
      )}

      {quote.warnings.length > 0 && (
        <div className="pt-3">
          <Notice tone="pending" title="Please read">
            <ul className="list-disc space-y-1 pl-4">
              {quote.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <div className="pt-3">
        <Details summary="Technical detail">
          <p>NGN → USDC rate: {quote.ngnToAssetRate} (indicative, operator-set)</p>
          <p>
            BOB rate: {quote.payoutRate} ({quote.payoutRateSource})
          </p>
          {quote.provider && (
            <p>
              Provider: {quote.provider} · rail {quote.providerRail}
            </p>
          )}
          <p>Quote id: {quote.id}</p>
        </Details>
      </div>
    </Card>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
    >
      <ArrowLeft size={16} aria-hidden /> Home
    </Link>
  );
}
