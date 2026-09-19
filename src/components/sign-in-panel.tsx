'use client';

import { usePollar } from '@pollar/react';
import { Wallet } from 'lucide-react';
import { Button, Card, Notice } from '@/components/ui';
import { useWalletSignIn } from '@/hooks/use-wallet-signin';
import { authErrorMessage, usePollarAuthState } from '@/hooks/use-pollar-auth-state';

/**
 * Two-part sign-in.
 *
 *  1. Authenticate with Pollar's standard modal and configured sign-in methods.
 *  2. Prove wallet ownership with SEP-53 so our server can open a session.
 *
 * Step 2 is what makes the address trustworthy. A connected address on its own
 * never establishes a server session.
 */
export function SignInPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const { isAuthenticated, verified, wallet, openLoginModal, configStatus, retryConfig } = usePollar();
  const { phase, error, signIn } = useWalletSignIn();
  const authState = usePollarAuthState();
  const authError = authErrorMessage(authState);

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
        <h2 className="text-lg font-semibold">Welcome to AfriPuente</h2>
        <p className="text-sm text-[var(--muted)]">
          Create an account or sign in securely with Pollar. Choose any sign-in option enabled for this application.
        </p>
        <Button size="lg" onClick={openLoginModal}>Continue with Pollar</Button>
        {configStatus === 'error' && (
          <Notice tone="danger" title="Sign-in options unavailable">
            Pollar could not load your sign-in options. <Button variant="secondary" onClick={retryConfig}>Try again</Button>
          </Notice>
        )}
        {authError && <Notice tone="danger" title="Could not sign in">{authError}</Notice>}
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
        disabled={!verified || !wallet?.address || phase === 'signing' || phase === 'verifying' || phase === 'requesting'}
        onClick={async () => {
          const okDone = await signIn();
          if (okDone) onSignedIn?.();
        }}
      >
        {phase === 'requesting' && 'Preparing…'}
        {phase === 'signing' && 'Waiting for your wallet…'}
        {phase === 'verifying' && 'Verifying…'}
        {(phase === 'idle' || phase === 'error' || phase === 'done') && (verified ? 'Continue to AfriPuente' : 'Restoring your session…')}
      </Button>

      {error && <Notice tone="danger" title="Could not verify your wallet">{error}</Notice>}
    </Card>
  );
}
