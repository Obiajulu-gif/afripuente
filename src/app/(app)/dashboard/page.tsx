import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CheckCircle2, Circle, Inbox, Send, TriangleAlert, TrendingUp, ShieldCheck } from 'lucide-react';
import { Badge, Card, LinkButton, PageHeader, StatusBadge } from '@/components/ui';
import { WalletBalanceCard } from '@/components/dashboard/wallet-balance-card';
import { TransferList, type TransferRowData } from '@/components/transfers/transfer-list';
import { getSessionUser } from '@/lib/auth/session';
import { db, withDbRetry } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { weakestMode } from '@/lib/corridor/state';
import { needsAttention, nextAction, stateLabel, stateTone } from '@/lib/corridor/presentation';

export const metadata: Metadata = { title: 'Dashboard' };

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
    mode: weakestMode([t.fundingMode, t.settlementMode, t.payoutMode]),
    createdAt: t.createdAt,
    sendDisplay: t.quote ? formatMoney(t.quote.sendAmountMinor, 'NGN') : '—',
    settleDisplay: t.quote ? `${t.quote.settlementAmount} USDC` : undefined,
    receiveDisplay: t.quote ? formatMoney(t.quote.payoutAmountMinor, 'BOB') : '—',
  }));

  const attention = transfers.filter((t) => needsAttention(t.state));
  const completed = transfers.filter((t) => t.state === 'COMPLETED').length;

  const fundedNgnMinor = transfers
    .filter((t) => t.fundingStatus === 'VERIFIED' && ['LIVE', 'MANUALLY_VERIFIED'].includes(t.fundingMode) && t.quote)
    .reduce((sum, t) => sum + (t.quote?.sendAmountMinor ?? 0n), 0n);

  const isNew = transfers.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Overview of cross-border transfers from Nigeria (NGN) to Bolivia (BOB).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'OPERATOR' && (
            <LinkButton href="/operator" variant="secondary" size="md">
              <ShieldCheck size={16} className="text-[var(--violet)]" /> Operator queue
            </LinkButton>
          )}
          <LinkButton href="/send" size="md">
            <Send size={16} /> Send payment
          </LinkButton>
        </div>
      </div>

      {/* 3 Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WalletBalanceCard />

        <Card className="flex flex-col justify-between border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium uppercase tracking-wider">Payments Started</span>
            <TrendingUp size={16} className="text-[var(--accent)]" />
          </div>
          <div className="my-2">
            <p className="tnum text-3xl font-bold text-[var(--text)]">{transfers.length}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--line)]">
            <span>{completed} completed · includes sandbox demos</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium uppercase tracking-wider">Naira Funding Verified</span>
            <CheckCircle2 size={16} className="text-[var(--ok)]" />
          </div>
          <div className="my-2">
            <p className="tnum text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {formatMoney(fundedNgnMinor, 'NGN')}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--line)]">
            <span>Verified against bank record</span>
            <span className="font-mono text-[11px] text-[var(--accent)]">NGN</span>
          </div>
        </Card>
      </div>

      {/* Attention Banner if needed */}
      {attention.length > 0 && (
        <Card className="border-[var(--warn)]/40 bg-[var(--warn-soft)]/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TriangleAlert size={17} className="text-[var(--warn)]" aria-hidden />
              <h2 className="text-sm font-semibold text-[var(--text)]">Action required on transfers</h2>
            </div>
            <Badge tone="pending">{attention.length}</Badge>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {attention.slice(0, 3).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transfers/${t.id}`}
                  className="t-fast flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[var(--text)]">
                      {t.recipientName}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">
                      {t.reference}
                    </span>
                  </div>
                  <StatusBadge label={stateLabel(t.state)} tone={stateTone(t.state)} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Onboarding helper for empty accounts */}
      {isNew && (
        <Card className="border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--text)]">Getting started with AfriPuente</h2>
          <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Sign in & Wallet proof',
                body: 'Done — your wallet authenticated securely with SEP-53 ed25519 signature.',
                done: true,
              },
              {
                step: '02',
                title: 'Start payment',
                body: 'Input amount in Naira and recipient details for Bolivian bank deposit.',
                done: false,
              },
              {
                step: '03',
                title: 'Fund via bank transfer',
                body: 'Pay with reference. Operator verifies deposit and releases Stellar USDC settlement.',
                done: false,
              },
            ].map((s) => (
              <li
                key={s.title}
                className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">{s.step}</span>
                    {s.done ? (
                      <CheckCircle2 size={16} className="text-[var(--ok)]" />
                    ) : (
                      <Circle size={16} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)]">{s.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <LinkButton href="/send" size="md">
              Start your first transfer <ArrowRight size={15} />
            </LinkButton>
          </div>
        </Card>
      )}

      {/* Main Transfers Section */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">All Transfers</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time records tracked across Nigerian funding, Stellar settlement, and Bolivian payout.
            </p>
          </div>
          {rows.length > 0 && (
            <Link
              href="/activity"
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Activity log →
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <Card className="border-[var(--line)] bg-[var(--surface)] p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] mb-3">
              <Inbox size={24} />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">No transfers recorded yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Initiate your first transfer from Nigeria to Bolivia to view live status tracking.
            </p>
            <div className="mt-4">
              <LinkButton href="/send" size="sm">
                Create transfer
              </LinkButton>
            </div>
          </Card>
        ) : (
          <TransferList rows={rows} showToolbar={true} />
        )}
      </section>
    </div>
  );
}
