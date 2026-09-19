import type { Metadata } from 'next';
import { SendFlow } from '@/components/send-flow';
import { getSessionUser } from '@/lib/auth/session';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Send payment' };

// Server component: the session is read from the cookie here, so a page reload
// never re-prompts a signed-in user for the wallet ownership proof.
//
// `?amount=` carries the figure a visitor explored on the landing page, so
// signing in does not lose their input.

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const [user, params] = await Promise.all([
    getSessionUser().catch(() => null),
    searchParams,
  ]);

  const raw = params.amount ?? '';
  const initialAmount = /^\d{1,12}(\.\d{1,2})?$/.test(raw) ? String(Number(raw)) : '250000';

  return <SendFlow signedIn={Boolean(user)} initialAmount={initialAmount} sandbox={['SANDBOX', 'SIMULATED'].includes(env.NGN_FUNDING_MODE)} />;
}
