'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select } from '@/components/ui';

/**
 * Operator reconciliation form.
 *
 * The operator records what the BANK actually shows. The server decides the
 * outcome: if the received amount does not equal the expected amount, the
 * server records MISMATCHED regardless of what was selected here.
 */
export function ReconcileForm({
  transferId,
  expectedAmount,
}: {
  transferId: string;
  expectedAmount: string;
}) {
  const router = useRouter();
  const [bankReference, setBankReference] = useState('');
  const [receivedAmountNgn, setReceivedAmountNgn] = useState('');
  const [decision, setDecision] = useState<'VERIFIED' | 'MISMATCHED'>('VERIFIED');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/operator/transfers/${transferId}/verify-funding`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ bankReference, receivedAmountNgn, decision, notes }),
          });
          const json = await res.json();
          if (!res.ok) setError(json.message ?? 'Could not reconcile.');
          else router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        label="Bank reference from the statement"
        htmlFor={`ref-${transferId}`}
        hint="Must be the bank's own reference. Each one can fund only one transfer."
      >
        <Input
          id={`ref-${transferId}`}
          required
          value={bankReference}
          onChange={(e) => setBankReference(e.target.value)}
        />
      </Field>

      <Field
        label="Amount actually received (NGN)"
        htmlFor={`amt-${transferId}`}
        hint={`Expected ${expectedAmount}.`}
      >
        <Input
          id={`amt-${transferId}`}
          required
          inputMode="decimal"
          value={receivedAmountNgn}
          onChange={(e) => setReceivedAmountNgn(e.target.value)}
        />
      </Field>

      <Field label="Decision" htmlFor={`dec-${transferId}`}>
        <Select
          id={`dec-${transferId}`}
          value={decision}
          onChange={(e) => setDecision(e.target.value as 'VERIFIED' | 'MISMATCHED')}
        >
          <option value="VERIFIED">Matches the expected payment</option>
          <option value="MISMATCHED">Does not match</option>
        </Select>
      </Field>

      <Field label="Notes (optional)" htmlFor={`n-${transferId}`}>
        <Input id={`n-${transferId}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Button type="submit" disabled={busy}>
        {busy ? 'Recording…' : 'Record reconciliation'}
      </Button>

      {error && <Notice tone="danger" title="Could not reconcile">{error}</Notice>}
    </form>
  );
}
