'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Notice } from '@/components/ui';

export function SimulationControls({ transferId, version, label }: { transferId: string; version: string; label: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <Card className="mb-6 space-y-3">
    <h2 className="font-semibold">{label ? 'Sandbox walkthrough' : 'Sandbox receipt'}</h2>
    <p className="text-sm text-[var(--muted)]">{label
      ? 'Advance each step with fictional funds. No bank payment, blockchain transaction or recipient payout will be made.'
      : 'Demo complete. The recipient payment was simulated; this receipt is not proof of a real payment.'}</p>
    {label && <Button disabled={busy || refreshing} onClick={async () => {
      setBusy(true); setError(null);
      try {
        const res = await fetch(`/api/transfers/${transferId}/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? 'Could not advance the demo.');
        startTransition(() => router.refresh());
      } catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>{busy || refreshing ? 'Updating demo…' : label}</Button>}
    {error && <Notice tone="danger" title="Demo could not advance">{error}</Notice>}
  </Card>;
}
