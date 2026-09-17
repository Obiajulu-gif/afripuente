'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePollar } from '@pollar/react';
import { RefreshCw, TriangleAlert, Wallet } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components/ui';

/**
 * Wallet balance, backed by the real Pollar balance state.
 *
 * Two rules this component exists to enforce:
 *
 *  1. A failed balance request must NOT render as "0". Zero is a fact about
 *     someone's money; "we could not read it" is a different fact. They get
 *     different UI.
 *  2. A `null` balance from the SDK means that chain could not be read (the
 *     @pollar/core README is explicit about this), so it is also shown as
 *     unavailable rather than as zero.
 */

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

interface BalanceRow {
  code: string;
  balance: string | null;
  chain?: string;
  issuer?: string;
}

export function WalletBalanceCard() {
  const { wallet, walletBalance, refreshWalletBalance } = usePollar();
  const [refreshing, setRefreshing] = useState(false);

  // User-initiated refresh: tracks its own pending flag for the spinner.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWalletBalance();
    } catch {
      // The SDK pushes the failure into walletBalance state, which we render.
    } finally {
      setRefreshing(false);
    }
  }, [refreshWalletBalance]);

  // Initial load. Calls the SDK directly rather than `refresh`, because the SDK
  // already reports 'loading' through walletBalance.step — setting our own flag
  // here would be a synchronous setState inside an effect.
  useEffect(() => {
    if (walletBalance.step !== 'idle') return;
    void refreshWalletBalance().catch(() => undefined);
  }, [walletBalance.step, refreshWalletBalance]);

  const rows: BalanceRow[] =
    walletBalance.step === 'loaded'
      ? ((walletBalance.data?.balances ?? []) as BalanceRow[])
      : [];

  // Prefer the settlement asset; fall back to the first readable row.
  const primary = rows.find((r) => r.code === 'USDC') ?? rows[0];
  const unreadable = walletBalance.step === 'error';

  return (
    <Card className="relative overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)]">
            <Wallet size={17} aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Wallet balance</h2>
            <p className="text-xs text-[var(--text-muted)]">Stellar {NETWORK}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing || walletBalance.step === 'loading'}
          aria-label="Refresh balance"
        >
          <RefreshCw
            size={15}
            aria-hidden
            className={refreshing || walletBalance.step === 'loading' ? 'animate-spin' : undefined}
          />
        </Button>
      </div>

      {walletBalance.step === 'loading' || walletBalance.step === 'idle' ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : unreadable ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--danger)]">
            <TriangleAlert size={16} aria-hidden />
            Balance unavailable
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            We could not read your balance just now. This does not mean your balance is zero — your
            funds are unaffected.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Try again
          </Button>
        </div>
      ) : !primary ? (
        <div>
          <p className="tnum text-3xl font-semibold text-[var(--text)]">0.00</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            No assets yet. Your wallet is ready to receive the settlement asset.
          </p>
        </div>
      ) : primary.balance === null ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--warn)]">
            <TriangleAlert size={16} aria-hidden />
            Unavailable
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            The {primary.chain ?? 'Stellar'} network could not be read. This is not a zero balance.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Try again
          </Button>
        </div>
      ) : (
        <div>
          <p className="tnum text-3xl font-semibold text-[var(--text)]">
            {primary.balance}{' '}
            <span className="text-base font-medium text-[var(--text-muted)]">{primary.code}</span>
          </p>

          {rows.length > 1 && (
            <ul className="mt-3 space-y-1">
              {rows
                .filter((r) => r !== primary)
                .slice(0, 3)
                .map((r) => (
                  <li
                    key={`${r.chain ?? 'stellar'}-${r.code}-${r.issuer ?? 'native'}`}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-[var(--text-muted)]">{r.code}</span>
                    <span className="tnum font-medium">
                      {r.balance === null ? (
                        <span className="text-[var(--text-muted)]">Unavailable</span>
                      ) : (
                        r.balance
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {wallet?.address && (
        // `break-all`, not `truncate`: a 56-character address with
        // white-space:nowrap sets a huge intrinsic width, which pushes the grid
        // column wider than the viewport and scrolls the whole page on mobile.
        <p className="mt-4 border-t border-[var(--line)] pt-3 font-mono text-[11px] break-all text-[var(--text-muted)]">
          {wallet.address}
        </p>
      )}

      {NETWORK !== 'mainnet' && (
        <div className="mt-3">
          <Badge tone="pending">Test network — not real money</Badge>
        </div>
      )}
    </Card>
  );
}
