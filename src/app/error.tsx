'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary.
 *
 * A failure here is usually the database being unreachable — Neon suspends an
 * idle compute and the first request after that can fail while it wakes.
 *
 * The message deliberately says nothing about money having moved or not moved,
 * because at this point we genuinely do not know: we could not read the state.
 * Claiming either way would be worse than admitting we cannot tell.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[afripuente] render error:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-2 text-xl font-semibold tracking-tight">We could not load this page</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Something went wrong on our side. No action you have taken has been lost — this page
          simply could not be read just now. Your transfers and their history are stored and will
          be exactly as you left them.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--teal)] px-4 text-sm font-medium text-white hover:bg-[var(--teal-strong)]"
          >
            Try again
          </button>
          <Link
            href="/activity"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            Go to your transfers
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-[var(--muted)]">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
