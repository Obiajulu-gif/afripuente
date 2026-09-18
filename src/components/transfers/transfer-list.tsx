'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, Filter, ArrowUpDown, ExternalLink, CheckSquare, Square } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { stateLabel, stateTone } from '@/lib/corridor/presentation';

export interface TransferRowData {
  id: string;
  reference: string;
  recipientName: string;
  state: string;
  createdAt: Date;
  sendDisplay: string;
  settleDisplay?: string;
  receiveDisplay: string;
}

function formatDate(d: Date | string) {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TransferList({
  rows,
  title = 'Transfers',
  showToolbar = true,
}: {
  rows: TransferRowData[];
  title?: string;
  showToolbar?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'recipient' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.recipientName.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q) ||
          r.sendDisplay.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.state === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      if (sortBy === 'recipient') {
        return sortOrder === 'desc'
          ? b.recipientName.localeCompare(a.recipientName)
          : a.recipientName.localeCompare(b.recipientName);
      }
      return 0;
    });

    return result;
  }, [rows, searchQuery, statusFilter, sortBy, sortOrder]);

  const allSelected = filteredRows.length > 0 && selectedIds.length === filteredRows.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      {showToolbar && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pl-9 pr-3 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              <Filter size={13} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter transfers by status"
                className="bg-transparent text-xs text-[var(--text)] focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--surface-2)]">All Statuses</option>
                <option value="AWAITING_FUNDING" className="bg-[var(--surface-2)]">Waiting payment</option>
                <option value="FUNDING_REVIEW" className="bg-[var(--surface-2)]">Checking payment</option>
                <option value="SETTLING" className="bg-[var(--surface-2)]">Sending</option>
                <option value="COMPLETED" className="bg-[var(--surface-2)]">Completed</option>
                <option value="MANUAL_REVIEW" className="bg-[var(--surface-2)]">Needs Review</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              <ArrowUpDown size={13} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'recipient')}
                aria-label="Sort transfers by attribute"
                className="bg-transparent text-xs text-[var(--text)] focus:outline-none cursor-pointer"
              >
                <option value="date" className="bg-[var(--surface-2)]">Date</option>
                <option value="recipient" className="bg-[var(--surface-2)]">Recipient</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                className="text-[var(--accent)] hover:underline ml-1 font-medium"
              >
                {sortOrder === 'desc' ? 'Desc' : 'Asc'}
              </button>
            </div>

            {filteredRows.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {allSelected ? <CheckSquare size={13} className="text-[var(--accent)]" /> : <Square size={13} />}
                <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile: cards */}
      <ul className="space-y-3 lg:hidden">
        {filteredRows.length === 0 ? (
          <li className="p-8 text-center text-xs text-[var(--text-muted)] border border-[var(--line)] rounded-2xl bg-[var(--surface)]">
            No transfers found matching your criteria.
          </li>
        ) : (
          filteredRows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/transfers/${r.id}`}
                className="t-fast block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]"
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
          ))
        )}
      </ul>

      {/* Desktop: Structured Table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] lg:block shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Your transfers list</caption>
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]/60 text-xs font-semibold text-[var(--text-muted)]">
              <th scope="col" className="w-10 py-3.5 pl-4 pr-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label="Select all transfers"
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {allSelected ? <CheckSquare size={15} className="text-[var(--accent)]" /> : <Square size={15} />}
                </button>
              </th>
              <th scope="col" className="py-3.5 pr-4">Recipient</th>
              <th scope="col" className="py-3.5 pr-4">Reference</th>
              <th scope="col" className="py-3.5 pr-4 text-right">You send (NGN)</th>
              <th scope="col" className="py-3.5 pr-4 text-right">Recipient gets (BOB)</th>
              <th scope="col" className="py-3.5 pr-4">Status</th>
              <th scope="col" className="py-3.5 pr-4">Date</th>
              <th scope="col" className="py-3.5 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No transfers found.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`t-fast group hover:bg-[var(--surface-2)]/70 ${
                      isSelected ? 'bg-[var(--accent)]/5' : ''
                    }`}
                  >
                    <td className="py-3.5 pl-4 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleSelect(r.id)}
                        aria-label={`Select transfer ${r.reference}`}
                        className="text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        {isSelected ? <CheckSquare size={15} className="text-[var(--accent)]" /> : <Square size={15} />}
                      </button>
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-[var(--text)]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--accent)]">
                          {r.recipientName.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[140px]">{r.recipientName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-[var(--text-muted)]">
                      <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--line)]">
                        {r.reference}
                      </span>
                    </td>
                    <td className="tnum py-3.5 pr-4 text-right font-medium text-[var(--text)]">
                      {r.sendDisplay}
                    </td>
                    <td className="tnum py-3.5 pr-4 text-right font-medium text-[var(--ok)]">
                      {r.receiveDisplay}
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge label={stateLabel(r.state)} tone={stateTone(r.state)} />
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-[var(--text-muted)]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <Link
                        href={`/transfers/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-xs"
                      >
                        View
                        <ChevronRight size={13} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table footer info */}
        <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-2)]/30 px-4 py-3 text-xs text-[var(--text-muted)]">
          <span>
            Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? 'transfer' : 'transfers'}
            {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
          </span>
          <span className="font-mono text-[11px]">Nigeria (NGN) → Bolivia (BOB)</span>
        </div>
      </div>
    </div>
  );
}
