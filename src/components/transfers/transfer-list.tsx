import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { stateLabel, stateTone } from '@/lib/corridor/presentation';

// One transfer presentation shared by the dashboard and activity screens:
// a real table on desktop, readable cards on mobile. Both are driven by the
// same rows, so the two can never disagree.

export interface TransferRowData {
  id: string;
  reference: string;
  recipientName: string;
  state: string;
  createdAt: Date;
  sendDisplay: string;
  receiveDisplay: string;
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TransferList({ rows }: { rows: TransferRowData[] }) {
  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/transfers/${r.id}`}
              className="t-fast block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {r.recipientName}
                  </p>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{r.reference}</p>
                </div>
                <StatusBadge label={stateLabel(r.state)} tone={stateTone(r.state)} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">{formatDate(r.createdAt)}</span>
                <span className="text-right">
                  <span className="tnum block text-sm font-semibold text-[var(--text)]">
                    {r.sendDisplay}
                  </span>
                  <span className="tnum block text-xs text-[var(--text-muted)]">
                    → {r.receiveDisplay}
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table. Wrapped so a long row scrolls itself, never the page. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Your transfers</caption>
          <thead>
            <tr className="border-b border-[var(--line)] text-left">
              <th scope="col" className="py-3 pr-4 font-medium text-[var(--text-muted)]">
                Recipient
              </th>
              <th scope="col" className="py-3 pr-4 font-medium text-[var(--text-muted)]">
                Reference
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium text-[var(--text-muted)]">
                You send
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium text-[var(--text-muted)]">
                They receive
              </th>
              <th scope="col" className="py-3 pr-4 font-medium text-[var(--text-muted)]">
                Date
              </th>
              <th scope="col" className="py-3 pr-4 font-medium text-[var(--text-muted)]">
                Status
              </th>
              <th scope="col" className="py-3">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="t-fast border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)]"
              >
                <td className="py-3 pr-4 font-medium text-[var(--text)]">{r.recipientName}</td>
                <td className="py-3 pr-4 font-mono text-xs text-[var(--text-muted)]">
                  {r.reference}
                </td>
                <td className="tnum py-3 pr-4 text-right font-medium">{r.sendDisplay}</td>
                <td className="tnum py-3 pr-4 text-right text-[var(--text-muted)]">
                  {r.receiveDisplay}
                </td>
                <td className="py-3 pr-4 text-[var(--text-muted)]">{formatDate(r.createdAt)}</td>
                <td className="py-3 pr-4">
                  <StatusBadge label={stateLabel(r.state)} tone={stateTone(r.state)} />
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/transfers/${r.id}`}
                    className="t-fast inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    Details
                    <ChevronRight size={15} aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
