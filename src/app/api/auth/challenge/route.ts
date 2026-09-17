import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ok, parseBody, toErrorResponse, fail } from '@/lib/api';
import { isValidStellarAddress } from '@/lib/auth/wallet-proof';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const schema = z.object({
  address: z.string().min(1),
});

/**
 * Issue a single-use ownership challenge.
 *
 * The nonce is generated server-side and stored. A client cannot choose the
 * message it signs, and a captured signature cannot be replayed because the
 * nonce is consumed on verification.
 */
export async function POST(request: Request) {
  try {
    const { address } = await parseBody(request, schema);

    if (!isValidStellarAddress(address)) {
      return fail('BAD_ADDRESS', 'That is not a valid Stellar address.', 400);
    }

    const nonce = `AfriPuente sign-in\naddress: ${address}\nnonce: ${randomBytes(24).toString('hex')}\nissued: ${new Date().toISOString()}`;

    const challenge = await db.walletChallenge.create({
      data: {
        nonce,
        address,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
      select: { nonce: true, expiresAt: true },
    });

    return ok(challenge);
  } catch (err) {
    return toErrorResponse(err);
  }
}
