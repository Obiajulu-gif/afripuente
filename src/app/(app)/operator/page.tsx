import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Badge, Card, Details, Notice, Row } from '@/components/ui';
import { ReconcileForm } from '@/components/reconcile-form';
import { getSessionUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';

// Operator workspace. Authority is checked here AND again in every operator
// API route — rendering this page is never what authorises an action.

export default async function OperatorPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Shell>
        <Notice tone="pending" title="Sign in required">
          Sign in with an operator account to use this workspace.
        </Notice>
      </Shell>
    );
  }

  if (user.role !== 'OPERATOR') {
    return (
      <Shell>
        <Notice tone="danger" title="Operator access required">
          This account is not an operator. Operator accounts are configured server-side via the
          OPERATOR_EMAILS allowlist.
        </Notice>
      </Shell>
    );
  }

  const queue = await db.transfer.findMany({
    where: { fundingStatus: { in: ['REPORTED', 'MISMATCHED'] } },
    orderBy: { createdAt: 'asc' },
    include: { funding: true, quote: true, user: { select: { email: true } } },
    take: 50,
  });

  const recent = await db.auditEvent.findMany({
    where: { actorType: 'OPERATOR' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck size={20} className="text-[var(--teal)]" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Operator workspace</h1>
      </div>

      <div className="mb-6">
        <Notice tone="info" title="What you are confirming">
          You are confirming that the naira actually arrived, by checking the bank record yourself.
          A sender pressing &quot;I have paid&quot; is not evidence. Every action here is recorded
          against your account.
        </Notice>
      </div>

      <h2 className="mb-3 text-sm font-semibold">
        Funding queue {queue.length > 0 && <Badge tone="pending">{queue.length}</Badge>}
      </h2>

      {queue.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            Nothing waiting. Transfers appear here once a sender reports a bank payment.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {queue.map((t) => (
            <li key={t.id}>
              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/transfers/${t.id}`} className="text-sm font-medium underline">
                      {t.recipientName}
                    </Link>
                    <p className="font-mono text-xs text-[var(--muted)]">{t.reference}</p>
                  </div>
                  <Badge tone={t.fundingStatus === 'MISMATCHED' ? 'danger' : 'pending'}>
                    {t.fundingStatus}
                  </Badge>
                </div>

                {t.funding && t.quote && (
                  <div>
                    <Row
                      label="Expected"
                      value={formatMoney(t.funding.expectedAmountMinor, 'NGN')}
                    />
                    <Row
                      label="Reported at"
                      value={t.funding.reportedAt?.toLocaleString() ?? '—'}
                    />
                    <Row label="Reference to match" value={t.funding.fundingReference} />
                  </div>
                )}

                {t.fundingStatus === 'MISMATCHED' ? (
                  <Notice tone="danger" title="Already reconciled as a mismatch">
                    This needs a refund decision. Reconciliation cannot be repeated from here.
                  </Notice>
                ) : (
                  <ReconcileForm
                    transferId={t.id}
                    expectedAmount={
                      t.funding ? formatMoney(t.funding.expectedAmountMinor, 'NGN') : '—'
                    }
                  />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Details summary="Recent operator actions">
          {recent.length === 0 ? (
            <p>No operator actions recorded yet.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((a) => (
                <li key={a.id}>
                  {a.createdAt.toLocaleString()} — {a.action}
                </li>
              ))}
            </ul>
          )}
        </Details>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} aria-hidden /> Home
      </Link>
      {children}
    </main>
  );
}
