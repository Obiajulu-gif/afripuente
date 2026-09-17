import Link from 'next/link';
import { ArrowRight, Banknote, ShieldCheck, Landmark } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';

// Landing page. No customer counts, testimonials, savings claims or volumes —
// none of those exist, so none are shown.

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">AfriPuente</span>
          <Badge tone="info">Nigeria → Bolivia</Badge>
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Local money. Connected continents.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
          A Nigerian agency can pay a Bolivian illustrator without either of them touching a
          crypto exchange. You pay in naira from your bank. Your recipient is paid in bolivianos
          into their bank account. Stellar carries the value in between.
        </p>
      </header>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/send">
          <Button size="lg">
            Send money <ArrowRight size={18} aria-hidden />
          </Button>
        </Link>
        <Link href="/demo">
          <Button size="lg" variant="secondary">
            View the guided demo
          </Button>
        </Link>
      </div>

      <p className="mb-10 text-sm text-[var(--muted)]">
        The guided demo is a <strong>simulated walkthrough</strong> with fictional people. It does
        not move money and is kept separate from real transfers.
      </p>

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <Banknote className="mb-3 text-[var(--teal)]" size={22} aria-hidden />
          <h2 className="mb-1 text-sm font-semibold">You pay in naira</h2>
          <p className="text-sm text-[var(--muted)]">
            A normal Nigerian bank transfer with a reference we give you.
          </p>
        </Card>
        <Card>
          <ShieldCheck className="mb-3 text-[var(--teal)]" size={22} aria-hidden />
          <h2 className="mb-1 text-sm font-semibold">Settled on Stellar</h2>
          <p className="text-sm text-[var(--muted)]">
            Value moves as USDC on Stellar, and you authorise the payment yourself.
          </p>
        </Card>
        <Card>
          <Landmark className="mb-3 text-[var(--teal)]" size={22} aria-hidden />
          <h2 className="mb-1 text-sm font-semibold">They receive bolivianos</h2>
          <p className="text-sm text-[var(--muted)]">
            Paid out in BOB through Pollar&apos;s Bolivian ramp partner.
          </p>
        </Card>
      </section>

      <Card className="mb-10">
        <h2 className="mb-3 text-sm font-semibold">What this is, plainly</h2>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li>
            The Bolivian payout uses Pollar&apos;s documented BOB corridor. The Nigerian funding
            leg has no automated provider — it is a documented, manually reconciled partner flow,
            and the app says so at every step.
          </li>
          <li>
            Each stage of a transfer records how it actually ran: simulated, sandbox, testnet, live
            or manually verified. A transfer is never described as live because one part of it was.
          </li>
          <li>
            A transfer is only marked complete when the payout provider confirms the recipient was
            paid — not when the blockchain transaction succeeds.
          </li>
        </ul>
      </Card>

      <footer className="border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        <p>
          Built for the Pollar hackathon. Running on Stellar{' '}
          <strong>{process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet'}</strong>. Testnet assets
          are not redeemable for real bolivianos.
        </p>
        <nav className="mt-3 flex gap-4">
          <Link className="underline" href="/activity">
            Activity
          </Link>
          <Link className="underline" href="/operator">
            Operator
          </Link>
        </nav>
      </footer>
    </main>
  );
}
