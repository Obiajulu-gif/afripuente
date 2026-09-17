'use client';

import { useState } from 'react';
import { usePollar } from '@pollar/react';
import { Mail, Wallet } from 'lucide-react';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { useWalletSignIn } from '@/hooks/use-wallet-signin';
import { authErrorMessage, usePollarAuthState } from '@/hooks/use-pollar-auth-state';

/**
 * Two-part sign-in.
 *
 *  1. Authenticate with Pollar (email OTP here — a real SDK flow).
 *  2. Prove wallet ownership with SEP-53 so our server can open a session.
 *
 * Step 2 is what makes the address trustworthy. A connected address on its own
 * never establishes a server session.
 */
export function SignInPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const { isAuthenticated, wallet, login, getClient, configStatus } = usePollar();
  const { phase, error, signIn } = useWalletSignIn();
  const authState = usePollarAuthState();
  const authError = authErrorMessage(authState);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [localError, setLocalError] = useState<string | null>(null);

  if (configStatus === 'loading') {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">Loading Pollar configuration…</p>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-[var(--teal)]" aria-hidden />
          <h2 className="text-sm font-semibold">Sign in</h2>
        </div>

        {stage === 'email' ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setLocalError(null);
              try {
                login({ provider: 'email', email });
                setStage('code');
              } catch (err) {
                setLocalError((err as Error).message);
              }
            }}
          >
            <Field label="Email address" htmlFor="email" hint="We send a one-time code.">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.ng"
              />
            </Field>
            <Button type="submit" size="lg">
              Send code
            </Button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setLocalError(null);
              try {
                getClient().verifyEmailCode(code);
              } catch (err) {
                setLocalError((err as Error).message);
              }
            }}
          >
            <Field label="One-time code" htmlFor="code">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="lg">
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  getClient().cancelLogin();
                  setCode('');
                  setStage('email');
                }}
              >
                Use a different email
              </Button>
            </div>
          </form>
        )}

        {authError && <Notice tone="danger" title="Could not sign in">{authError}</Notice>}
        {localError && <Notice tone="danger" title="Could not sign in">{localError}</Notice>}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-[var(--teal)]" aria-hidden />
        <h2 className="text-sm font-semibold">Confirm your wallet</h2>
      </div>

      <p className="text-sm text-[var(--muted)]">
        You are signed in to Pollar. To open a secure AfriPuente session we ask your wallet to sign
        a one-time message. This proves you control the address — we never see a private key.
      </p>

      {wallet?.address && (
        <p className="break-all font-mono text-xs text-[var(--muted)]">{wallet.address}</p>
      )}

      <Button
        size="lg"
        disabled={phase === 'signing' || phase === 'verifying' || phase === 'requesting'}
        onClick={async () => {
          const okDone = await signIn();
          if (okDone) onSignedIn?.();
        }}
      >
        {phase === 'requesting' && 'Preparing…'}
        {phase === 'signing' && 'Waiting for your wallet…'}
        {phase === 'verifying' && 'Verifying…'}
        {(phase === 'idle' || phase === 'error' || phase === 'done') && 'Prove wallet ownership'}
      </Button>

      {error && <Notice tone="danger" title="Could not verify your wallet">{error}</Notice>}
    </Card>
  );
}
