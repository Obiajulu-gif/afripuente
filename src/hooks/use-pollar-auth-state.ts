'use client';

import { useEffect, useState } from 'react';
import { usePollar } from '@pollar/react';
import type { AuthState } from '@pollar/core';

/**
 * Bridge `onAuthStateChange` into React state.
 *
 * `usePollar()` exposes `isAuthenticated` but not the auth state machine, so a
 * failed OTP (`/auth/email/verify-code` 400) would otherwise be invisible — the
 * form would appear to do nothing. This surfaces the SDK's own error code.
 *
 * Deliberately `useState` + `useEffect` rather than `useSyncExternalStore`:
 * `getAuthState()` returns a fresh object on every call, and
 * `useSyncExternalStore` requires a cached snapshot reference. Passing it
 * directly throws "getSnapshot should be cached" and loops until React bails
 * out with "Maximum update depth exceeded".
 */
export function usePollarAuthState(): AuthState {
  const { getClient } = usePollar();
  const [state, setState] = useState<AuthState>(() => getClient().getAuthState());

  // Subscribe only. The initial value comes from the lazy `useState` above, and
  // every later transition arrives through the subscription — so there is no
  // need to setState synchronously here, which would cause a cascading render.
  useEffect(() => getClient().onAuthStateChange(setState), [getClient]);

  return state;
}

const FRIENDLY: Record<string, string> = {
  EMAIL_CODE_INVALID: 'That code is not correct. Check the newest email and try again.',
  EMAIL_CODE_EXPIRED: 'That code has expired. Request a new one.',
  SESSION_CREATE_FAILED: 'Could not start a session with Pollar. Try again.',
  WALLET_CONNECT_FAILED: 'Could not connect your wallet.',
};

/** A human-readable message for an auth error, or null when not in error. */
export function authErrorMessage(state: AuthState): string | null {
  if (state.step !== 'error') return null;
  const code = state.errorCode ?? '';
  return FRIENDLY[code] ?? state.message ?? 'Sign-in failed. Please try again.';
}
