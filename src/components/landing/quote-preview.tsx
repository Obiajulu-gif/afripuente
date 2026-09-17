'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, RefreshCw } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/ui';

// Landing quote explorer. Lets a visitor try an amount before signing in, then
// carries that amount into the send flow so nothing is retyped.
//
// Every figure here comes from the server's real fee logic. It is always
// labelled an estimate, because this endpoint never attaches a provider quote —
// which is the truth, not a disclaimer bolted on.

interface Preview {
  sendNgn: string;
  fundingFeeNgn: string;
  settlementAmount: string;
  settlementAsset: string;
  receiveBob: string;
  ngnToAssetRate: string;
  payoutRate: string;
  guaranteed: boolean;
  estimatedAt: string;
}

const PRESETS = ['100000', '250000', '500000'];

function money(value: string, symbol: string) {
  const [whole, frac] = value.split('.');
  return `${symbol}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac ? `.${frac}` : ''}`;
}

export function QuotePreview() {
  const [amount, setAmount] = useState('250000');
  const [data, setData] = useState<Preview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validity is DERIVED during render, not stored. Storing it would mean
  // writing state synchronously inside an effect, which cascades renders.
  const clean = amount.replace(/[^\d.]/g, '');
  const invalid = !clean || Number(clean) <= 0;
  const error = invalid ? 'Enter an amount to see a quote.' : fetchError;

  const load = useCallback(async (value: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/quotes/preview?amount=${encodeURIComponent(value)}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.message ?? 'Could not calculate that amount.');
        setData(null);
      } else {
        setData(json.data);
      }
    } catch {
      setFetchError('Could not reach the pricing service. Check your connection and try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (invalid) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(clean), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [clean, invalid, load]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="glow-mint pointer-events-none absolute -inset-10 -z-10 rounded-full blur-2xl"
      />

      <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Try an amount</h2>
          <Badge tone="pending">Estimate</Badge>
        </div>

        <label htmlFor="landing-amount" className="mb-1.5 block text-xs text-[var(--text-muted)]">
          You send
        </label>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3">
          <span className="text-sm font-semibold text-[var(--text-muted)]">₦</span>
          <input
            id="landing-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-describedby="landing-amount-note"
            className="tnum min-h-12 w-full bg-transparent text-xl font-semibold text-[var(--text)] outline-none"
          />
          <span className="text-xs font-medium text-[var(--text-muted)]">NGN</span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`t-fast min-h-9 rounded-full border px-3 text-xs font-medium ${
                amount === p
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'border-[var(--line)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {money(p, '₦')}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load(amount.replace(/[^\d.]/g, '') || '250000')}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline"
            >
              <RefreshCw size={12} aria-hidden /> Try again
            </button>
          </div>
        ) : loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data ? (
          <div className={loading ? 'opacity-60 t-fast' : 't-fast'}>
            <dl className="space-y-2 border-t border-[var(--line)] pt-4">
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-[var(--text-muted)]">Funding charge</dt>
                <dd className="tnum text-sm font-medium">{money(data.fundingFeeNgn, '₦')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-[var(--text-muted)]">Settles on Stellar</dt>
                <dd className="tnum text-sm font-medium">
                  {data.settlementAmount} {data.settlementAsset}
                </dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[var(--line)] pt-3">
                <dt className="text-sm font-medium text-[var(--text)]">Recipient receives</dt>
                <dd className="tnum text-xl font-semibold text-[var(--text)]">
                  {money(data.receiveBob, 'Bs ')}
                </dd>
              </div>
            </dl>

            <p id="landing-amount-note" className="mt-4 flex gap-2 text-xs text-[var(--text-muted)]">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Illustrative estimate at an indicative rate, not a guaranteed quote. The Bolivian
                payout rate is confirmed by the provider before you authorise anything.
              </span>
            </p>

            <Link href={`/send?amount=${encodeURIComponent(data.sendNgn)}`} className="mt-5 block">
              <Button size="lg" full>
                Send this payment <ArrowRight size={18} aria-hidden />
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
