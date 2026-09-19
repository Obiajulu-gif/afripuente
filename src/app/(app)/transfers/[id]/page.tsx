import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Check, CircleDashed, Clock, TriangleAlert } from 'lucide-react';
import { Badge, Card, Details, Notice, Row } from '@/components/ui';
import { ReportFundingButton } from '@/components/report-funding-button';
import { SimulationControls } from '@/components/simulation-controls';
import { canSimulate, nextSimulationStep, simulationVersion } from '@/lib/corridor/simulation';
import { getSessionUser } from '@/lib/auth/session';
import { loadTransferForUser } from '@/lib/corridor/transfer-view';
import { describeMode, type TimelineStep } from '@/lib/corridor/state';
import { stateLabel as humanState, stateTone } from '@/lib/corridor/presentation';

// Server component: the transfer state lives in the database, so refreshing
// the page never restarts or loses a transfer.

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect('/send');

  const result = await loadTransferForUser(id, user.id, user.role === 'OPERATOR');
  if (result.error === 'NOT_FOUND') notFound();
  if (result.error === 'FORBIDDEN') {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <Notice tone="danger" title="Not your transfer">
          You do not have access to this transfer.
        </Notice>
      </main>
    );
  }

  const v = result.view;
  const simulated = canSimulate(result.transfer);
  const nextDemo = nextSimulationStep(result.transfer);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link
        href="/activity"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)]"
      >
        <ArrowLeft size={16} aria-hidden /> Activity
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">To {v.recipientName}</h1>
          <Badge tone={stateTone(v.state)}>{humanState(v.state)}</Badge>
        </div>
        <p className="font-mono text-sm text-[var(--muted)]">{v.reference}</p>
      </div>

      {/* Honest execution-mode banner. */}
      <div className="mb-6">
        <Notice
          tone={v.modes.fullyLive ? 'success' : 'pending'}
          title={v.modes.fullyLive ? 'Live transfer' : `Not a live transfer — ${v.modes.overall}`}
        >
          {v.modes.fullyLive
            ? 'Every leg of this transfer ran against real money.'
            : 'At least one leg of this transfer did not run against real money. Each leg is listed below with how it actually ran.'}
        </Notice>
      </div>

      {v.money && (
        <Card className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Amounts</h2>
            <Badge tone={v.money.guaranteed ? 'success' : 'pending'}>
              {v.money.guaranteed ? 'Provider rate · estimated total' : 'Estimate'}
            </Badge>
          </div>
          <Row label="You send" value={v.money.sendDisplay} />
          <Row label="Funding charge" value={v.money.fundingFeeDisplay} />
          <Row
            label="Settles as"
            value={`${v.money.settlementAmount} ${v.money.settlementAsset}`}
          />
          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <Row label="Recipient receives" value={<strong>{v.money.payoutDisplay}</strong>} />
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-semibold">{simulated ? 'Simulated progress' : 'Progress'}</h2>
        <ol className="space-y-4">
          {v.timeline.map((step) => (
            <TimelineRow key={step.key} step={step} />
          ))}
        </ol>
      </Card>

      {/* Next action */}
      {simulated && (nextDemo || v.statuses.payoutStatus === 'COMPLETED') && <SimulationControls transferId={v.id} version={simulationVersion(v.statuses)} label={nextDemo?.label ?? null} />}
      {!simulated && v.statuses.fundingStatus === 'AWAITING_FUNDING' && v.fundingInstructions && (
        <Card className="mb-6 space-y-4">
          <h2 className="text-sm font-semibold">{v.fundingInstructions.title}</h2>

          {/* Tone matches the actual risk: red only when there is genuinely
              nothing to pay, amber for a labelled test account. */}
          {v.fundingInstructions.warning && (
            <Notice
              tone={v.fundingInstructions.tone === 'simulated' ? 'danger' : 'pending'}
              title={
                v.fundingInstructions.tone === 'simulated'
                  ? 'Sandbox — do not send money'
                  : 'Sandbox test details'
              }
            >
              {v.fundingInstructions.warning}
            </Notice>
          )}

          <div>
            <Row label="Partner" value={v.fundingInstructions.partnerName} />
            <Row label="Bank" value={v.fundingInstructions.bankName} />
            <Row label="Account" value={v.fundingInstructions.accountNumber} />
            <Row
              label="Reference"
              value={<span className="font-mono">{v.fundingInstructions.reference}</span>}
            />
            {v.funding && <Row label="Amount" value={v.funding.expectedDisplay} />}
          </div>

          <p className="text-xs text-[var(--muted)]">
            Put the reference in the transfer narration. Without it we cannot match your payment.
          </p>

          <ReportFundingButton transferId={v.id} />
        </Card>
      )}

      {!simulated && v.statuses.fundingStatus === 'REPORTED' && (
        <div className="mb-6">
          <Notice tone="pending" title="Waiting for us to confirm your bank payment">
            You told us you have paid. An operator is checking the bank record. Nothing moves until
            that check passes.
          </Notice>
        </div>
      )}

      {v.statuses.fundingStatus === 'MISMATCHED' && (
        <div className="mb-6">
          <Notice tone="danger" title="The payment we received does not match">
            We received an amount or reference that does not match this transfer. Our team is
            reviewing it. Your money is recorded and has not been lost.
          </Notice>
        </div>
      )}

      {v.payout?.manualHandoffAt && (
        <div className="mb-6">
          <Notice tone="pending" title="Payout completed manually">
            This payout was operated by hand at the provider, not automatically.
            {v.payout.manualHandoffNote ? ` ${v.payout.manualHandoffNote}` : ''}
          </Notice>
        </div>
      )}

      <Details summary="Technical detail">
        <p>Transfer id: {v.id}</p>
        <p>Funding: {v.statuses.fundingStatus} — {describeMode(v.modes.funding)}</p>
        <p>Settlement: {v.statuses.settlementStatus} — {describeMode(v.modes.settlement)}</p>
        <p>Payout: {v.statuses.payoutStatus} — {describeMode(v.modes.payout)}</p>
        {v.funding?.bankReference && <p>Bank reference: {v.funding.bankReference}</p>}
        {v.delivery?.txHash && <p>Asset delivery tx: {v.delivery.txHash}</p>}
        {v.settlement?.txHash && (
          <p>
            Settlement tx: {v.settlement.txHash}
            {v.settlement.horizonVerifiedAt ? ' (verified on Horizon)' : ' (not yet verified)'}
          </p>
        )}
        {v.payout?.providerTxId && <p>Payout order: {v.payout.providerTxId}</p>}
        {v.payout?.anchorTransactionId && <p>Anchor tx: {v.payout.anchorTransactionId}</p>}
        {v.money?.settlementNetwork && <p>Network: {v.money.settlementNetwork}</p>}
      </Details>
    </main>
  );
}

function TimelineRow({ step }: { step: TimelineStep }) {
  const icon =
    step.state === 'done' ? (
      <Check size={16} className="text-[var(--success)]" aria-hidden />
    ) : step.state === 'active' ? (
      <Clock size={16} className="text-[var(--amber)]" aria-hidden />
    ) : step.state === 'blocked' ? (
      <TriangleAlert size={16} className="text-[var(--danger)]" aria-hidden />
    ) : (
      <CircleDashed size={16} className="text-[var(--muted)]" aria-hidden />
    );

  return (
    <li className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p
          className={
            step.state === 'pending'
              ? 'text-sm text-[var(--muted)]'
              : 'text-sm font-medium text-[var(--foreground)]'
          }
        >
          {step.label}
        </p>
        {step.detail && <p className="text-xs text-[var(--muted)]">{step.detail}</p>}
      </div>
    </li>
  );
}

