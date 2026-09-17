'use client';

import { useCallback, useState } from 'react';
import { usePollar } from '@pollar/react';

// Bridges a Pollar browser session into an AfriPuente server session.
//
// Sequence:
//   1. Ask our server for a single-use nonce bound to the wallet address.
//   2. Sign it with Pollar's SEP-53 message signing.
//   3. Post the proof; the server verifies the ed25519 signature and sets a cookie.
//
// Step 2 is the real Pollar SDK call that makes the address trustworthy. Without
// it, an address is just a string a client typed.

export type SignInPhase = 'idle' | 'requesting' | 'signing' | 'verifying' | 'done' | 'error';

interface SignInState {
  phase: SignInPhase;
  error: string | null;
}

export function useWalletSignIn() {
  const { wallet, getClient } = usePollar();
  const [state, setState] = useState<SignInState>({ phase: 'idle', error: null });

  const signIn = useCallback(async (): Promise<boolean> => {
    const address = wallet?.address;
    if (!address) {
      setState({ phase: 'error', error: 'Connect a wallet before signing in.' });
      return false;
    }

    const client = getClient();

    try {
      setState({ phase: 'requesting', error: null });
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const challengeJson = await challengeRes.json();
      if (!challengeRes.ok) {
        setState({ phase: 'error', error: challengeJson.message ?? 'Could not start sign-in.' });
        return false;
      }
      const nonce: string = challengeJson.data.nonce;

      // Real Pollar SDK call — SEP-53 ownership proof.
      setState({ phase: 'signing', error: null });
      const proof = await client.stellar.sep53.signMessage(nonce);

      if (proof.status !== 'signed') {
        setState({
          phase: 'error',
          error:
            proof.details ??
            'Your wallet could not sign the ownership proof. Passkey (smart) wallets cannot produce a SEP-53 signature.',
        });
        return false;
      }

      setState({ phase: 'verifying', error: null });
      // `session` only exists on the authenticated branch of the AuthState union.
      const authState = client.getAuthState();
      const pollarUserId = authState.step === 'authenticated' ? authState.session?.userId : undefined;
      if (!pollarUserId) {
        setState({ phase: 'error', error: 'Your Pollar session is not ready yet. Try again.' });
        return false;
      }
      const profile = client.getUserProfile();

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pollarUserId,
          email: profile?.mail ?? null,
          address: proof.signerAddress,
          nonce,
          signature: proof.signature,
          scheme: proof.scheme,
          network: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) {
        setState({ phase: 'error', error: verifyJson.message ?? 'Could not verify your wallet.' });
        return false;
      }

      setState({ phase: 'done', error: null });
      return true;
    } catch (err) {
      setState({ phase: 'error', error: (err as Error).message });
      return false;
    }
  }, [wallet?.address, getClient]);

  return { ...state, signIn };
}
