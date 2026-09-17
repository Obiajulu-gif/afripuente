import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CheckCircle2, Circle, Inbox, Send, TriangleAlert } from 'lucide-react';
import { Badge, Card, LinkButton, PageHeader, StatusBadge } from '@/components/ui';
import { WalletBalanceCard } from '@/components/dashboard/wallet-balance-card';
import { TransferList, type TransferRowData } from '@/components/transfers/transfer-list';
import { getSessionUser } from '@/lib/auth/session';
import { db, withDbRetry } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { needsAttention, nextAction, stateLabel, stateTone } from '@/lib/corridor/presentation';

export const metadata: Metadata = { title: 'Overview' };

// Only metrics that can be computed from real records appear here, and amounts
// are never summed across currencies. There are no decorative charts: a useful
// list of recent transfers is worth more than a graph of invented data.

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/send');

  const transfers = await withDbRetry(() =>
    db.transfer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
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

  const attention = transfers.filter((t) => needsAttention(t.state));
  const completed = transfers.filter((t) => t.state === 'COMPLETED').length;

  // Safe to add: every value is NGN minor units. Cross-currency totals are
  // deliberately not computed anywhere on this page.
  const fundedNgnMinor = transfers
    .filter((t) => t.fundingStatus === 'VERIFIED' && t.quote)
    .reduce((sum, t) => sum + (t.quote?.sendAmountMinor ?? 0n), 0n);

  const isNew = transfers.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Welcome${user.email ? `, ${user.email.split('@')[0]}` : ''}`}
        description="Your money and transfers between Nigeria and Bolivia."
        action={
          <LinkButton href="/send" size="lg">
            <Send size={17} aria-hidden /> Send payment
          </LinkButton>
        }
      />

      {/* Explicit `minmax(0,1fr)` tracks. A grid with no column utility uses an
          implicit `auto` track, whose base size is its content's min-content —
          so one wide descendant makes the track overflow its own container and
          scrolls the page. `minmax(0,…)` lets the track shrink. Tailwind's
          `grid-cols-N` already expands to `repeat(N, minmax(0,1fr))`, so only
          the single-column base case needs stating. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-1">
          <WalletBalanceCard />
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:col-span-2">
          <Card>
            <p className="text-sm text-[var(--text-muted)]">Payments started</p>
            <p className="tnum mt-2 text-3xl font-semibold text-[var(--text)]">
              {transfers.length}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {completed} completed{completed === 1 ? '' : ''}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-[var(--text-muted)]">Naira funding confirmed</p>
            <p className="tnum mt-2 text-3xl font-semibold text-[var(--text)]">
              {formatMoney(fundedNgnMinor, 'NGN')}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Verified against the bank record
            </p>
          </Card>

          {attention.length > 0 ? (
            <Card className="sm:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert size={16} className="text-[var(--warn)]" aria-hidden />
                <h2 className="text-sm font-semibold text-[var(--text)]">Needs your attention</h2>
                <Badge tone="pending">{attention.length}</Badge>
              </div>
              <ul className="space-y-2">
                {attention.slice(0, 3).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/transfers/${t.id}`}
                      className="t-fast flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3 hover:bg-[var(--surface-2)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--text)]">
                          {t.recipientName}
                        </span>
                        <span className="block truncate text-xs text-[var(--text-muted)]">
                          {nextAction(t.state) ?? stateLabel(t.state)}
                        </span>
                      </span>
                      <StatusBadge label={stateLabel(t.state)} tone={stateTone(t.state)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="sm:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--ok)]" aria-hidden />
                <h2 className="text-sm font-semibold text-[var(--text)]">Nothing needs you</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {isNew
                  ? 'Once you start a payment, anything waiting on you appears here.'
                  : 'No transfer is waiting on an action from you right now.'}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Onboarding for a new account */}
      {isNew && (
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text)]">Getting started</h2>
          <ol className="mt-4 space-y-3">
            {[
              {
                done: true,
                title: 'Sign in and confirm your wallet',
                body: 'Done — your wallet signed a one-time message to prove you control it.',
              },
              {
                done: false,
                title: 'Start your first payment',
                body: 'Choose an amount in naira and tell us who is being paid in Bolivia.',
              },
              {
                done: false,
                title: 'Fund it with a bank transfer',
                body: 'Use the reference we give you. We confirm it against the bank record before anything moves.',
              },
            ].map((s) => (
              <li key={s.title} className="flex gap-3">
                {s.done ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--ok)]" aria-hidden />
                ) : (
                  <Circle size={18} className="mt-0.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{s.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <LinkButton href="/send">
              Start a payment <ArrowRight size={16} aria-hidden />
            </LinkButton>
          </div>
        </Card>
      )}

      {/* Recent transfers */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Recent transfers
          </h2>
          {rows.length > 0 && (
            <Link
              href="/activity"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              View all
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Inbox size={26} className="text-[var(--text-muted)]" aria-hidden />
              <p className="text-sm font-semibold text-[var(--text)]">No transfers yet</p>
              <p className="max-w-sm text-sm text-[var(--text-muted)]">
                When you send money to Bolivia it appears here, with its full history.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="lg:p-4">
            <TransferList rows={rows.slice(0, 8)} />
          </Card>
        )}
      </section>
    </div>
  );
}
