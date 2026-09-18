'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePollar } from '@pollar/react';
import { Check, Copy, LogOut, Wallet, UserCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui';

export function AccountMenu({
  email,
  role,
  variant = 'header',
}: {
  email: string | null;
  role: string;
  variant?: 'header' | 'sidebar';
}) {
  const router = useRouter();
  const { wallet, getClient } = usePollar();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const address = wallet?.address ?? null;
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;
  const displayName = email ? email.split('@')[0] : 'User';
  const initial = email ? email.slice(0, 1).toUpperCase() : 'U';

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
      {variant === 'header' ? (
        /* Top Navigation Header Profile Chip (Matching Reference Image) */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="t-fast flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1.5 pl-3 pr-2 text-left hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)] shadow-xs cursor-pointer"
        >
          <div className="hidden sm:block text-right">
            <span className="block truncate text-xs font-semibold text-[var(--text)] max-w-[130px]">
              {email ?? 'Signed in'}
            </span>
            <span className="block text-[10px] font-medium text-[var(--text-muted)] capitalize">
              {role.toLowerCase()}
            </span>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--violet)] text-xs font-bold text-[var(--mint-ink)] shadow-xs">
            {initial}
          </div>
          <ChevronDown size={14} className="text-[var(--text-muted)]" />
        </button>
      ) : (
        /* Sidebar Menu */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="t-fast flex min-h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-left hover:bg-white/10"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <Wallet size={14} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-white">
              {email ?? 'Signed in'}
            </span>
            <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">
              {short ?? 'No wallet'}
            </span>
          </span>
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-[15rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)]',
            variant === 'header' ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-2 w-full',
          )}
        >
          <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
            <p className="text-xs font-semibold text-[var(--text)]">{email ?? displayName}</p>
            <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">{short ?? 'Testnet wallet'}</p>
            <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)]">
              {role}
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={copyAddress}
            disabled={!address}
            className={cn(
              't-fast flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs',
              address
                ? 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                : 'cursor-not-allowed text-[var(--text-muted)]',
            )}
          >
            {copied ? (
              <>
                <Check size={14} className="text-[var(--ok)]" aria-hidden />
                <span className="text-[var(--ok)] font-medium">Address copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} aria-hidden />
                <span>Copy wallet address</span>
              </>
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="t-fast flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60 mt-1"
          >
            <LogOut size={14} aria-hidden />
            <span>{busy ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
