import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Landmark,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Badge, Card, LinkButton } from '@/components/ui';
import { BridgeMark, RouteIllustration, Wordmark } from '@/components/brand';
import { SiteHeader } from '@/components/landing/site-header';
import { QuotePreview } from '@/components/landing/quote-preview';
import { getSessionUser } from '@/lib/auth/session';

// Landing page. Every claim here is one the product can actually back:
// no customer counts, no testimonials, no partner endorsements, no promises of
// instant delivery. The network label reflects the real configured network.

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

export default async function LandingPage() {
  const user = await getSessionUser().catch(() => null);
  const signedIn = Boolean(user);

  return (
    <div data-theme="night" className="min-h-dvh bg-[var(--bg)]">
      <SiteHeader signedIn={signedIn} />

      {/* `id="main"` is the target of the skip link in the root layout. */}
      <main id="main">
        {/* ---------------------------------------------------------- Hero -- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="glow-violet pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full blur-3xl"
          />
          <div className="mx-auto grid max-w-[var(--maxw)] gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-20">
            <div>
              <Badge tone="info">
                <BridgeMark size={14} /> Nigeria → Bolivia corridor
              </Badge>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
                Your money.
                <br />
                Across continents.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--text-muted)]">
                Pay from Nigeria to Bolivia with clear fees, local funding options, and payment
                tracking powered by Pollar on Stellar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/send" size="lg">
                  Send a payment <ArrowRight size={18} aria-hidden />
                </LinkButton>
                <LinkButton href="/demo" size="lg" variant="secondary">
                  Explore the demo
                </LinkButton>
              </div>

              <p className="mt-4 text-sm text-[var(--text-muted)]">
                The demo is a simulated walkthrough with fictional people. It moves no money.
              </p>

              <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <RouteIllustration />
                <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
                  Naira is funded locally, value settles as USDC on Stellar, and the recipient is
                  paid bolivianos into a Bolivian bank account.
                </p>
              </div>
            </div>

            <div className="lg:pt-10">
              <QuotePreview />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- How it works -- */}
        <section id="how-it-works" className="border-t border-[var(--line)] py-16 lg:py-24">
          <div className="mx-auto max-w-[var(--maxw)] px-4 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
              How it works
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
              Three stages, each tracked separately, so you always know exactly where a payment is.
            </p>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  n: '01',
                  icon: Banknote,
                  title: 'Fund locally',
                  body: 'Make a normal naira bank transfer using the reference we give you. We confirm the money arrived against the bank record before anything moves.',
                },
                {
                  n: '02',
                  icon: Wallet,
                  title: 'Authorize payment',
                  body: 'You review the fees and the amount your recipient receives, then authorise the Stellar payment yourself. We never hold your keys.',
                },
                {
                  n: '03',
                  icon: Landmark,
                  title: 'Track delivery',
                  body: 'Follow funding, settlement and the Bolivian payout as separate steps. A payment is only complete once the payout provider confirms it.',
                },
              ].map((s) => (
                <li key={s.n}>
                  <Card className="h-full">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--mint)]">
                        <s.icon size={20} aria-hidden />
                      </span>
                      <span className="tnum text-sm font-semibold text-[var(--text-muted)]">
                        {s.n}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text)]">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{s.body}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------ Features -- */}
        <section id="features" className="border-t border-[var(--line)] py-16 lg:py-24">
          <div className="mx-auto max-w-[var(--maxw)] px-4 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
              Built to be checkable
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
              A payments product is only as good as what it will admit to. These are the parts we
              consider non-negotiable.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Receipt,
                  title: 'Transparent fees',
                  body: 'Every charge is itemised before you commit: the funding charge, what settles on Stellar, and what your recipient receives. Estimates are labelled as estimates.',
                },
                {
                  icon: Wallet,
                  title: 'Wallet control',
                  body: 'Your wallet stays yours. We never take custody of your keys and never ask for a seed phrase. You sign your own payment.',
                },
                {
                  icon: BadgeCheck,
                  title: 'Transfer tracking',
                  body: 'Funding, on-chain settlement and the fiat payout are tracked independently, so a transfer can never claim to be finished while money is still moving.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Verified sign-in',
                  body: 'Signing in proves you control your wallet by signing a one-time message. A wallet address on its own is never treated as proof of identity.',
                },
                {
                  icon: Landmark,
                  title: 'Independent confirmation',
                  body: 'A bank payment is confirmed against the bank record by an authorised operator. Pressing “I have paid” is recorded as a claim, not as evidence.',
                },
                {
                  icon: BridgeMark,
                  title: 'Honest status',
                  body: 'Each stage records how it actually ran — simulated, testnet, live or manually verified — and a transfer always reports its weakest stage.',
                },
              ].map((f) => (
                <Card key={f.title} className="h-full">
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--mint)]">
                    <f.icon size={20} aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold text-[var(--text)]">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{f.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Corridor -- */}
        <section className="border-t border-[var(--line)] py-16 lg:py-24">
          <div className="mx-auto grid max-w-[var(--maxw)] gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
                About this corridor
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--text-muted)]">
                The Bolivian side uses Pollar&apos;s documented boliviano off-ramp, which pays into a
                Bolivian bank account. The Nigerian side has no automated provider, so it runs as a
                documented partner flow with a manual reconciliation step.
              </p>
              <p className="mt-4 leading-relaxed text-[var(--text-muted)]">
                That manual step is deliberate and visible. An operator checks the bank record
                before any value moves, and every action they take is recorded against their
                account.
              </p>

              <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)]">Who holds what</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                  <li>
                    <strong className="text-[var(--text)]">Your wallet:</strong> you control it. We
                    hold no keys.
                  </li>
                  <li>
                    <strong className="text-[var(--text)]">Naira during conversion:</strong> held by
                    the Nigerian funding partner. This is a custodial step.
                  </li>
                  <li>
                    <strong className="text-[var(--text)]">The boliviano payout:</strong> performed
                    by Pollar&apos;s ramp partner, which holds funds until the recipient is paid.
                  </li>
                </ul>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Two stages are custodial. It would be wrong to call the whole corridor
                  non-custodial just because you hold your own wallet.
                </p>
              </div>
            </div>

            <div className="lg:pt-4">
              <Card>
                <h3 className="text-sm font-semibold text-[var(--text)]">Current status</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ['Naira funding', 'Documented partner flow, manually reconciled'],
                    ['Stellar settlement', `Running on ${NETWORK}`],
                    ['Boliviano payout', 'Pollar ramp, subject to provider availability'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-wrap justify-between gap-2">
                      <dt className="text-[var(--text-muted)]">{k}</dt>
                      <dd className="font-medium text-[var(--text)]">{v}</dd>
                    </div>
                  ))}
                </dl>
                {NETWORK !== 'mainnet' && (
                  <p className="mt-4 rounded-xl bg-[var(--warn-soft)] p-3 text-xs text-[var(--warn)]">
                    This deployment runs on Stellar {NETWORK}. Test assets are not redeemable for
                    real bolivianos.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ -- */}
        <section id="faq" className="border-t border-[var(--line)] py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
              Questions
            </h2>

            <div className="mt-8 space-y-3">
              {[
                {
                  q: 'How long does a payment take?',
                  a: 'It depends on how quickly the naira transfer clears and on the payout provider. We do not promise a delivery time, because neither leg is instant and we would rather not guess. Every stage is visible while it happens.',
                },
                {
                  q: 'Is the exchange rate guaranteed?',
                  a: 'The estimate shown before you sign in is not guaranteed. When the payout provider returns a real quote, it is labelled as provider-guaranteed and carries an expiry. If a quote expires before your money arrives, your funds are preserved and you are asked to accept a new quote or take a refund.',
                },
                {
                  q: 'Do you hold my crypto or my keys?',
                  a: 'No. Your wallet is yours and you authorise your own payment. We never ask for a seed phrase or private key. Two stages of the corridor are custodial — naira held by the funding partner, and funds held by the payout provider — and we say so plainly.',
                },
                {
                  q: 'How do you know my bank payment arrived?',
                  a: 'An authorised operator checks the bank record independently and enters the bank’s own reference and the exact amount received. If the amount does not match what was expected, the system records a mismatch regardless of what the operator selected.',
                },
                {
                  q: 'When is a transfer marked complete?',
                  a: 'Only when the payout provider confirms the recipient was paid. A confirmed Stellar transaction is not treated as a completed payout — they are separate events.',
                },
                {
                  q: 'What happens if something goes wrong?',
                  a: 'The transfer moves to a review state rather than silently failing, and your funding record is preserved. If a payout fails after settlement, it is escalated for manual review rather than shown as a plain failure.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
                >
                  <summary className="cursor-pointer list-none text-base font-medium text-[var(--text)] marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {item.q}
                      <span
                        aria-hidden
                        className="mt-1 shrink-0 text-[var(--mint)] transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA -- */}
        <section className="border-t border-[var(--line)] py-16 lg:py-24">
          <div className="mx-auto max-w-[var(--maxw)] px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center sm:p-12">
              <div
                aria-hidden
                className="glow-mint pointer-events-none absolute inset-x-0 -top-24 h-64 blur-2xl"
              />
              <h2 className="relative text-3xl font-semibold tracking-tight text-[var(--text)]">
                Send your first payment
              </h2>
              <p className="relative mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
                Explore an amount, see the fees in full, and decide before you commit to anything.
              </p>
              <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/send" size="lg">
                  Send a payment <ArrowRight size={18} aria-hidden />
                </LinkButton>
                <LinkButton href="/demo" size="lg" variant="secondary">
                  Explore the demo
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------- Footer -- */}
      <footer className="border-t border-[var(--line)] py-10">
        <div className="mx-auto max-w-[var(--maxw)] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-sm text-sm text-[var(--text-muted)]">
                Local money. Connected continents. Payments from Nigeria to Bolivia, powered by
                Pollar on Stellar.
              </p>
            </div>

            <nav aria-label="Footer" className="flex gap-10">
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
                  Product
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link className="text-[var(--text-muted)] hover:text-[var(--text)]" href="/send">
                      Send a payment
                    </Link>
                  </li>
                  <li>
                    <Link className="text-[var(--text-muted)] hover:text-[var(--text)]" href="/demo">
                      Guided demo
                    </Link>
                  </li>
                  <li>
                    <a className="text-[var(--text-muted)] hover:text-[var(--text)]" href="#faq">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
                  Learn
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a
                      className="text-[var(--text-muted)] hover:text-[var(--text)]"
                      href="#how-it-works"
                    >
                      How it works
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-[var(--text-muted)] hover:text-[var(--text)]"
                      href="https://docs.pollar.xyz/"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Pollar docs
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-[var(--text-muted)] hover:text-[var(--text)]"
                      href="https://developers.stellar.org/"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Stellar docs
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-[var(--line)] pt-6 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>Running on Stellar {NETWORK}. Not affiliated with any bank.</p>
            <p>© {new Date().getFullYear()} AfriPuente</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
