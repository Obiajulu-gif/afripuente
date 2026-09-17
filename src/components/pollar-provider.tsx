'use client';

import { PollarProvider } from '@pollar/react';
import '@pollar/react/styles.css';
import type { ReactNode } from 'react';

// The Pollar SDK is browser-only: server-side it degrades to a no-op and warns.
// This is the single 'use client' boundary that owns it.
//
// The publishable key is safe here — it is origin-locked in the Pollar
// dashboard under Build -> Domains. The secret key is never imported into any
// client module.

const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;
const baseUrl = process.env.NEXT_PUBLIC_POLLAR_BASE_URL ?? 'https://sdk.api.pollar.xyz';
const stellarNetwork =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

export function AppPollarProvider({ children }: { children: ReactNode }) {
  if (!apiKey) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Pollar is not configured.</p>
          <p className="mt-1">
            Set <code className="font-mono">NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY</code> in{' '}
            <code className="font-mono">.env.local</code>. Sign-in and the Bolivian payout cannot
            run without it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PollarProvider client={{ apiKey, baseUrl, stellarNetwork }}>{children}</PollarProvider>
  );
}
