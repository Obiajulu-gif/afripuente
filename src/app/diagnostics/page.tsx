'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePollar } from '@pollar/react';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card, Notice } from '@/components/ui';
import { fetchBoliviaOfframpQuotes, fetchSupportedCountries } from '@/lib/pollar/ramp';

// Developer diagnostics. Runs REAL Pollar SDK calls under the signed-in user's
// session and prints exactly what comes back â€” including empty results.
//
// This exists because the documented corridor table and what an application's
// enabled anchors actually offer are two different things. Assuming the former
// is how a product ends up claiming a payout route it does not have.

interface Result {
  label: string;
  ok: boolean;
  detail: string;
}

export default function DiagnosticsPage() {
  const { isAuthenticated, getClient } = usePollar();
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const out: Result[] = [];
    const client = getClient();

    // 1. Which countries do THIS app's enabled anchors actually support?
    const countries = await fetchSupportedCountries(client);
    if (!countries.ok) {
      out.push({ label: 'GET /ramps/countries', ok: false, detail: `${countries.code}: ${countries.message}` });
    } else {
      const list = countries.data.map((c) => `${c.code}${c.currency ? `/${c.currency}` : ''}`).join(', ');
      const hasBolivia = countries.data.some((c) => c.code === 'BO');
      out.push({
        label: 'GET /ramps/countries',
        ok: hasBolivia,
        detail: `${countries.data.length} countries: ${list || '(none)'} â€” Bolivia ${hasBolivia ? 'PRESENT' : 'ABSENT'}`,
      });
    }

    // 2. Off-ramp quotes for Bolivia across a range of amounts. An empty result
    //    at one amount may just be below a provider minimum.
    for (const amount of [50, 100, 500, 1000, 5000, 10000]) {
      const q = await fetchBoliviaOfframpQuotes(client, amount);
      if (!q.ok) {
        out.push({ label: `BOB offramp quote @ ${amount}`, ok: false, detail: `${q.code}: ${q.message}` });
      } else if (q.data.length === 0) {
        out.push({ label: `BOB offramp quote @ ${amount}`, ok: false, detail: 'returned 0 quotes' });
      } else {
        out.push({
          label: `BOB offramp quote @ ${amount}`,
          ok: true,
          detail: JSON.stringify(q.data, null, 2),
        });
      }
    }

    setResults(out);
    setBusy(false);
  }

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} aria-hidden /> Home
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Corridor diagnostics</h1>
        <Badge tone="info">Developer tool</Badge>
      </div>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Runs real Pollar SDK calls under your session and prints the raw response, including empty
        results. Read-only â€” it creates nothing.
      </p>

      {!isAuthenticated ? (
        <Notice tone="pending" title="Sign in first">
          Ramp endpoints require an authenticated Pollar session.{' '}
          <Link className="underline" href="/send">
            Sign in
          </Link>
          .
        </Notice>
      ) : (
        <Card className="space-y-4">
          <Button onClick={run} disabled={busy}>
            {busy ? 'Runningâ€¦' : 'Run corridor checks'}
          </Button>

          {results.map((r) => (
            <div key={r.label} className="border-t border-[var(--border)] pt-3">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'OK' : 'NO'}</Badge>
                <span className="text-sm font-medium">{r.label}</span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-[var(--muted)]">
                {r.detail}
              </pre>
            </div>
          ))}
        </Card>
      )}
    </main>
  );
}
