'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePollar } from '@pollar/react';
import { Check, Copy, LogOut, Wallet } from 'lucide-react';
import { cn } from '@/components/ui';

/**
 * Account control: shows the connected wallet, copies the address with
 * feedback, and signs out of BOTH sessions — ours (cookie) and Pollar's
 * (browser storage + DPoP keypair). Clearing only one would leave the user in a
 * confusing half-signed-in state.
 */
export function AccountMenu({ email, role }: { email: string | null; role: string }) {
  const router = useRouter();
  const { wallet, getClient } = usePollar();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const address = wallet?.address ?? null;
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions). Say so rather
      // than showing a success tick that did nothing.
      setCopied(false);
      window.prompt('Copy your wallet address', address);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      try {
        await getClient().logout();
      } catch {
        // Pollar revocation is best-effort; our cookie is already cleared.
      }
      router.replace('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="t-fast flex min-h-11 w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-left hover:bg-[var(--surface-2)]"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
          <Wallet size={14} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-[var(--text)]">
            {email ?? 'Signed in'}
          </span>
          <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">
            {short ?? 'No wallet connected'}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[15rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-md)]"
        >
          {role === 'OPERATOR' && (
            <p className="px-2.5 py-2 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Operator account
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={copyAddress}
            disabled={!address}
            className={cn(
              't-fast flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm',
              address
                ? 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                : 'cursor-not-allowed text-[var(--text-muted)]',
            )}
          >
            {copied ? (
              <>
                <Check size={15} className="text-[var(--ok)]" aria-hidden />
                <span className="text-[var(--ok)]">Address copied</span>
              </>
            ) : (
              <>
                <Copy size={15} aria-hidden />
                <span>Copy wallet address</span>
              </>
            )}
          </button>
          <span aria-live="polite" className="sr-only">
            {copied ? 'Wallet address copied to clipboard' : ''}
          </span>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="t-fast flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
          >
            <LogOut size={15} aria-hidden />
            <span>{busy ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
