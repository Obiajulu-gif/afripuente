import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox, Search } from 'lucide-react';
import { Card, EmptyState, LinkButton, PageHeader } from '@/components/ui';
import { TransferList, type TransferRowData } from '@/components/transfers/transfer-list';
import { getSessionUser } from '@/lib/auth/session';
import { db, withDbRetry } from '@/lib/db';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Activity' };

// Filters run server-side against the user's OWN records. The status options
// are the derived roll-up states, so they match exactly what the list shows.

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'In progress' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'completed', label: 'Completed' },
] as const;

const FILTER_STATES: Record<string, string[] | undefined> = {
  all: undefined,
  open: ['AWAITING_FUNDING', 'FUNDING_REVIEW', 'SETTLING', 'PAYING_OUT'],
  attention: ['MANUAL_REVIEW', 'FAILED'],
  completed: ['COMPLETED', 'REFUNDED'],
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const filter = params.filter && FILTER_STATES[params.filter] !== undefined ? params.filter : 'all';
  const query = (params.q ?? '').trim();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Activity" description="Sign in to see your transfers." />
        <Card>
          <EmptyState
            icon={<Inbox size={26} aria-hidden />}
            title="You are not signed in"
            description="Sign in to see the transfers on your account and their full history."
            action={<LinkButton href="/send">Sign in</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  const states = FILTER_STATES[filter];

  const transfers = await withDbRetry(() =>
    db.transfer.findMany({
      where: {
        userId: user.id,
        ...(states ? { state: { in: states as never[] } } : {}),
        ...(query
          ? {
              OR: [
                { recipientName: { contains: query, mode: 'insensitive' as const } },
                { reference: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { quote: true },
    }),
  );

  const rows: TransferRowData[] = transfers.map((t) => ({
    id: t.id,
    reference: t.reference,
    recipientName: t.recipientName,
    state: t.state,
    createdAt: t.createdAt,
    sendDisplay: t.quote ? formatMoney(t.quote.sendAmountMinor, 'NGN') : '—',
    receiveDisplay: t.quote ? formatMoney(t.quote.payoutAmountMinor, 'BOB') : '—',
  }));

  const filtering = filter !== 'all' || query.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Activity"
        description="Every payment on your account."
        action={<LinkButton href="/send">Send payment</LinkButton>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter transfers" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const href = `/activity?filter=${f.key}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
            return (
              <Link
                key={f.key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`t-fast inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--line)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        {/* GET form: the query lives in the URL, so it survives refresh and
            can be shared or bookmarked. */}
        <form action="/activity" method="get" className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <label htmlFor="q" className="sr-only">
            Search by recipient or reference
          </label>
          <div className="relative">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Recipient or reference"
              className="min-h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-sm sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="t-fast min-h-10 rounded-xl border border-[var(--line)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          {filtering ? (
            <EmptyState
              icon={<Search size={26} aria-hidden />}
              title="No transfers match"
              description="No transfer on your account matches that filter or search. Try a different term, or clear the filter."
              action={<LinkButton href="/activity" variant="secondary">Clear filters</LinkButton>}
            />
          ) : (
            <EmptyState
              icon={<Inbox size={26} aria-hidden />}
              title="No transfers yet"
              description="When you send money to Bolivia it appears here, with amount, date, recipient and status."
              action={<LinkButton href="/send">Send your first payment</LinkButton>}
            />
          )}
        </Card>
      ) : (
        <Card className="lg:p-4">
          <TransferList rows={rows} />
        </Card>
      )}
    </div>
  );
}
