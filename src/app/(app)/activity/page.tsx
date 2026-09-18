import type { Metadata } from 'next';
import { Inbox, Send } from 'lucide-react';
import { Card, EmptyState, LinkButton } from '@/components/ui';
import { TransferList, type TransferRowData } from '@/components/transfers/transfer-list';
import { getSessionUser } from '@/lib/auth/session';
import { db, withDbRetry } from '@/lib/db';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Activity' };

export default async function ActivityPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Activity</h1>
        <Card className="border-[var(--line)] bg-[var(--surface)] p-8">
          <EmptyState
            icon={<Inbox size={28} aria-hidden />}
            title="You are not signed in"
            description="Sign in to see the transfers on your account and their full history."
            action={<LinkButton href="/send">Sign in</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  const transfers = await withDbRetry(() =>
    db.transfer.findMany({
      where: { userId: user.id },
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
    settleDisplay: t.quote ? `${t.quote.settlementAmount} USDC` : undefined,
    receiveDisplay: t.quote ? formatMoney(t.quote.payoutAmountMinor, 'BOB') : '—',
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Activity & History
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Complete transaction record of all Nigeria (NGN) to Bolivia (BOB) transfers.
          </p>
        </div>
        <div>
          <LinkButton href="/send" size="md">
            <Send size={15} /> Send money
          </LinkButton>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border-[var(--line)] bg-[var(--surface)] p-12 text-center">
          <EmptyState
            icon={<Inbox size={32} aria-hidden />}
            title="No transfers yet"
            description="When you send money to Bolivia it appears here, with amount, date, recipient and status."
            action={<LinkButton href="/send">Send your first payment</LinkButton>}
          />
        </Card>
      ) : (
        <TransferList rows={rows} showToolbar={true} />
      )}
    </div>
  );
}
