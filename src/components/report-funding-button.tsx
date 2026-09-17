'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';

export function ReportFundingButton({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(`/api/transfers/${transferId}/report-funding`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({}),
            });
            const json = await res.json();
            if (!res.ok) setError(json.message ?? 'Could not record that.');
            else router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Recording…' : 'I have made the bank transfer'}
      </Button>
      <p className="text-xs text-[var(--muted)]">
        This tells us to look for your payment. It is not proof of payment on its own — an operator
        checks the bank record before anything moves.
      </p>
      {error && <Notice tone="danger" title="Could not record that">{error}</Notice>}
    </div>
  );
}
