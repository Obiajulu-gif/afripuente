import { z } from 'zod';
import { db } from '@/lib/db';
import { env, operatorEmails } from '@/lib/env';
import { ok, parseBody, toErrorResponse, fail } from '@/lib/api';
import { verifyWalletProof } from '@/lib/auth/wallet-proof';
import { createSession } from '@/lib/auth/session';

const schema = z.object({
  pollarUserId: z.string().min(1),
  email: z.string().email().nullish(),
  address: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  scheme: z.string().min(1),
  network: z.string().default('testnet'),
});

/**
 * Establish a server session from a proven wallet.
 *
 * A connected address is NOT an authentication claim. The session is only
 * created after the SEP-53 signature over a server-issued, unconsumed nonce
 * verifies against that exact address.
 */
export async function POST(request: Request) {
  try {
    const body = await parseBody(request, schema);

    // 1. The nonce must exist, match the address, be unexpired and unconsumed.
    const challenge = await db.walletChallenge.findUnique({ where: { nonce: body.nonce } });
    if (!challenge) return fail('UNKNOWN_CHALLENGE', 'Sign-in request not recognised.', 400);
    if (challenge.consumedAt) return fail('CHALLENGE_USED', 'That sign-in request was already used.', 400);
    if (challenge.expiresAt.getTime() <= Date.now()) {
      return fail('CHALLENGE_EXPIRED', 'Sign-in request expired. Please try again.', 400);
    }
    if (challenge.address !== body.address) {
      return fail('ADDRESS_MISMATCH', 'Sign-in request was issued for a different wallet.', 400);
    }

    // 2. Verify the signature itself.
    const result = verifyWalletProof({
      address: body.address,
      nonce: body.nonce,
      signature: body.signature,
      scheme: body.scheme,
    });
    if (!result.ok) {
      return fail('PROOF_REJECTED', `Could not verify wallet ownership (${result.reason}).`, 401);
    }

    // 3. Consume the nonce. The updateMany with `consumedAt: null` makes this a
    //    compare-and-set: two concurrent requests cannot both consume it.
    const consumed = await db.walletChallenge.updateMany({
      where: { nonce: body.nonce, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      return fail('CHALLENGE_USED', 'That sign-in request was already used.', 409);
    }

    const email = body.email?.toLowerCase() ?? null;
    // The operator allowlist is configuration, applied server-side. A client
    // can never assert its own role.
    const role = email && operatorEmails.includes(email) ? 'OPERATOR' : 'SENDER';

    const user = await db.user.upsert({
      where: { pollarUserId: body.pollarUserId },
      create: { pollarUserId: body.pollarUserId, email, role },
      // Role is re-applied from the allowlist on every sign-in so removing an
      // email from the allowlist actually demotes that user.
      update: { email, role },
      select: { id: true, role: true },
    });

    await db.walletRef.upsert({
      where: {
        userId_address_network: {
          userId: user.id,
          address: body.address,
          network: body.network,
        },
      },
      create: {
        userId: user.id,
        address: body.address,
        network: body.network,
        proofScheme: body.scheme,
        proofNonce: body.nonce,
        proofSignature: body.signature,
        verifiedAt: new Date(),
      },
      update: {
        proofScheme: body.scheme,
        proofNonce: body.nonce,
        proofSignature: body.signature,
        verifiedAt: new Date(),
      },
    });

    await db.auditEvent.create({
      data: {
        actorType: 'USER',
        actorUserId: user.id,
        action: 'auth.wallet_verified',
        // Address is truncated; no PII or full credentials in the audit log.
        metadata: { address: `${body.address.slice(0, 4)}…${body.address.slice(-4)}`, network: body.network },
      },
    });

    await createSession(user.id);

    return ok({ userId: user.id, role: user.role, network: body.network, stellarNetwork: env.STELLAR_HORIZON_URL.includes('testnet') ? 'testnet' : 'mainnet' });
  } catch (err) {
    return toErrorResponse(err);
  }
}
