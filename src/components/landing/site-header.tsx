'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button, LinkButton } from '@/components/ui';

// Landing header. `signedIn` is resolved on the server by the page, so an
// authenticated visitor is offered their dashboard instead of "Get started".

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the control that opened it —
  // otherwise keyboard users are stranded at the top of the document.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[var(--maxw)] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="AfriPuente home">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="t-fast rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link href="/dashboard">
              <Button size="md">Open dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/send">
                <Button variant="ghost" size="md">
                  Sign in
                </Button>
              </Link>
              <Link href="/send">
                <Button size="md">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="t-fast inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--text)] md:hidden"
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          ref={panelRef}
          className="border-t border-[var(--line)] bg-[var(--bg)] px-4 pb-5 pt-3 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="min-h-12 rounded-lg px-2 py-3 text-base text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-2">
            {signedIn ? (
              <LinkButton href="/dashboard" size="lg" full>
                Open dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/send" size="lg" variant="secondary" full>
                  Sign in
                </LinkButton>
                <LinkButton href="/send" size="lg" full>
                  Get started
                </LinkButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
