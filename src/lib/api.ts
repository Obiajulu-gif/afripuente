import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type output } from 'zod';
import { AuthError } from '@/lib/auth/session';
import { QuoteError } from '@/lib/corridor/quote';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, code, message }, { status });
}

/**
 * Single place where thrown errors become responses. Unexpected errors are
 * logged server-side and returned as a generic message, so internal detail and
 * any personal data in an error string never reach the client.
 */
export function toErrorResponse(err: unknown) {
  if (err instanceof AuthError) return fail('UNAUTHORIZED', err.message, err.status);
  if (err instanceof QuoteError) return fail(err.code, err.message, 400);
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail('VALIDATION_ERROR', `${first.path.join('.') || 'body'}: ${first.message}`, 400);
  }
  console.error('[afripuente] unhandled error:', err);
  return fail('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500);
}

// Generic over the schema, not its output, so `.default()` fields resolve to
// their post-parse (non-optional) types.
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ZodError([
      { code: 'custom', path: ['body'], message: 'Expected a JSON body.' },
    ]);
  }
  return schema.parse(raw);
}

/** BigInt is not JSON-serialisable; money crosses the wire as a decimal string. */
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}
