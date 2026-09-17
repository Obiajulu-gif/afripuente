import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';
import { db } from '@/lib/db';

// Server session. The cookie carries only an opaque user id and is signed;
// authority is ALWAYS re-read from the database, never trusted from the token.
// In particular the operator role is never taken from the cookie.

const COOKIE_NAME = 'afripuente_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export interface SessionUser {
  id: string;
  pollarUserId: string;
  email: string | null;
  role: 'SENDER' | 'OPERATOR';
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Resolve the current user, or null. The role is read fresh from the database
 * on every call, so revoking an operator takes effect immediately rather than
 * when their cookie happens to expire.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, pollarUserId: true, email: true, role: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    pollarUserId: user.pollarUserId,
    email: user.email,
    role: user.role,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('Sign in to continue.', 401);
  return user;
}

/** Operator authority is re-checked here, server-side, on every operator action. */
export async function requireOperator(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'OPERATOR') throw new AuthError('Operator access required.', 403);
  return user;
}
