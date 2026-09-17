import Link from 'next/link';
import { ArrowLeft, Check, Clock, CircleDashed } from 'lucide-react';
import { Badge, Card, Notice, Row } from '@/components/ui';

// Simulated walkthrough with fictional people.
//
// This page is deliberately READ-ONLY: it contains no controls that write to the
// database. A demo control must never mutate a live transfer or bypass a
// payment check, so the simplest safe design is to have no such control at all.

export const metadata = { title: 'Guided demo — AfriPuente' };

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} aria-hidden /> Home
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Guided demo</h1>
        <Badge tone="pending">Simulated</Badge>
      </div>

      <div className="mb-8">
        <Notice tone="pending" title="Nothing here is real">
          This walkthrough uses fictional people and fixed numbers to explain the journey. It moves
          no money, writes nothing to the database, and cannot change a real transfer. To exercise
          the real flow, use <Link className="underline" href="/send">Send money</Link>.
        </Notice>
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">The situation</h2>
        <p className="text-sm text-[var(--muted)]">
          Adaeze runs a small creative agency in Lagos. She commissioned illustrations from
          Valentina, who lives in Santa Cruz, Bolivia. Adaeze has naira in a Nigerian bank account.
          Valentina needs bolivianos in a Bolivian bank account. Neither wants to open a crypto
          exchange account, and a correspondent bank transfer would be slow and expensive.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">The quote Adaeze sees</h2>
        <Row label="She sends" value="₦250,000.00" />
        <Row label="Funding charge (1.5%)" value="₦3,750.00" />
        <Row label="Settles on Stellar as" value="149.2424242 USDC" />
        <div className="mt-2 border-t border-[var(--border)] pt-2">
          <Row label="Valentina receives" value={<strong>Bs 1,038.72</strong>} />
        </div>
        <p className="pt-3 text-xs text-[var(--muted)]">
          Illustrative figures at an indicative rate of ₦1,650 per USDC and Bs 6.96 per USDC. Real
          quotes carry an expiry and say whether a provider guaranteed them.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-semibold">What happens, in order</h2>
        <ol className="space-y-4">
          <Step state="done" title="Adaeze signs in and proves her wallet">
            She signs in with an email code, then her wallet signs a one-time message (SEP-53). A
            connected address alone would not be enough to open a session.
          </Step>
          <Step state="done" title="She gets a quote and enters Valentina's details">
            The recipient form is built from whatever the Bolivian provider says it needs. We do
            not invent a bank form.
          </Step>
          <Step state="done" title="She pays naira with a reference">
            A normal Nigerian bank transfer. She then tells us she has paid.
          </Step>
          <Step state="active" title="An operator checks the bank record">
            &quot;I have paid&quot; is a claim. An operator confirms the money actually arrived,
            and records the bank reference. Nothing moves before this.
          </Step>
          <Step state="pending" title="USDC is delivered and Adaeze authorises the payment">
            The funding partner delivers USDC to her wallet. That delivery is verified on-chain
            against the wallet, asset and amount — a cleared bank deposit never invents a balance.
          </Step>
          <Step state="pending" title="Pollar's Bolivian ramp pays Valentina">
            The off-ramp order is created, the asset is sent to the address the provider gives us,
            and the payout is tracked separately from the blockchain transaction.
          </Step>
          <Step state="pending" title="Completed — only when the provider confirms">
            A confirmed Stellar transaction is not a completed payout. The transfer is marked
            complete when the provider confirms Valentina was paid.
          </Step>
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Who holds what</h2>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li>
            <strong>Wallet keys:</strong> the sender controls their own wallet through Pollar.
            AfriPuente never holds a private key or seed phrase.
          </li>
          <li>
            <strong>Naira during conversion:</strong> held by the Nigerian funding partner, not by
            AfriPuente and not by Pollar. This is a custodial step.
          </li>
          <li>
            <strong>The Bolivian payout:</strong> performed by Pollar&apos;s ramp partner, which
            holds the funds between receiving USDC and paying bolivianos.
          </li>
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]">
          It would be wrong to call this corridor non-custodial simply because the sender controls
          their wallet. Two legs are custodial.
        </p>
      </Card>
    </main>
  );
}

function Step({
  state,
  title,
  children,
}: {
  state: 'done' | 'active' | 'pending';
  title: string;
  children: React.ReactNode;
}) {
  const icon =
    state === 'done' ? (
      <Check size={16} className="text-[var(--success)]" aria-hidden />
    ) : state === 'active' ? (
      <Clock size={16} className="text-[var(--amber)]" aria-hidden />
    ) : (
      <CircleDashed size={16} className="text-[var(--muted)]" aria-hidden />
    );

  return (
    <li className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-[var(--muted)]">{children}</p>
      </div>
    </li>
  );
}
