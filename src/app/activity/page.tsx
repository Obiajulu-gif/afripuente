import Link from 'next/link';
import { ArrowLeft, Inbox } from 'lucide-react';
import { Badge, Button, Card, type Tone } from '@/components/ui';
import { getSessionUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';

export default async function ActivityPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <Home />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Activity</h1>
        <Card className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Sign in to see your transfers.</p>
          <Link href="/send">
            <Button>Sign in</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const transfers = await db.transfer.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { quote: true },
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Home />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <Link href="/send">
          <Button>New transfer</Button>
        </Link>
      </div>

      {transfers.length === 0 ? (
        <Card className="space-y-3 text-center">
          <Inbox className="mx-auto text-[var(--muted)]" size={28} aria-hidden />
          <p className="text-sm font-medium">No transfers yet</p>
          <p className="text-sm text-[var(--muted)]">
            When you send money to Bolivia, it appears here with its full history.
          </p>
          <div className="pt-2">
            <Link href="/send">
              <Button>Send your first payment</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {transfers.map((t) => (
            <li key={t.id}>
              <Link href={`/transfers/${t.id}`} className="block">
                <Card className="transition-colors hover:bg-[var(--surface-muted)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t.recipientName}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{t.reference}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {t.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {t.quote && (
                        <>
                          <p className="text-sm font-medium tabular-nums">
                            {formatMoney(t.quote.sendAmountMinor, 'NGN')}
                          </p>
                          <p className="text-xs text-[var(--muted)] tabular-nums">
                            → {formatMoney(t.quote.payoutAmountMinor, 'BOB')}
                          </p>
                        </>
                      )}
                      <div className="mt-2">
                        <Badge tone={stateTone(t.state)}>{humanState(t.state)}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Home() {
  return (
    <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
      <ArrowLeft size={16} aria-hidden /> Home
    </Link>
  );
}

function humanState(state: string): string {
  const map: Record<string, string> = {
    AWAITING_FUNDING: 'Waiting for payment',
    FUNDING_REVIEW: 'Checking payment',
    SETTLING: 'Sending',
    PAYING_OUT: 'Recipient payment pending',
    COMPLETED: 'Completed',
    MANUAL_REVIEW: 'Being reviewed',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
    CANCELLED: 'Cancelled',
    DRAFT: 'Draft',
  };
  return map[state] ?? state;
}

function stateTone(state: string): Tone {
  if (state === 'COMPLETED') return 'success';
  if (state === 'FAILED' || state === 'MANUAL_REVIEW') return 'danger';
  if (state === 'CANCELLED' || state === 'REFUNDED') return 'neutral';
  return 'pending';
}
