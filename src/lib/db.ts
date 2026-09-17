import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Retry a query through a transient connection failure.
 *
 * Neon suspends an idle compute, so the first request after a quiet period can
 * fail with P1001 ("can't reach database server") while the branch wakes up.
 * That is a cold start, not an outage, and it resolves in a second or two.
 *
 * Only connection-level errors are retried. A constraint violation, a missing
 * row or any other query error is rethrown immediately — retrying those would
 * risk repeating a side effect.
 */
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024']);

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (!code || !TRANSIENT_CODES.has(code)) throw err;

      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}
