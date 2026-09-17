import { ok, toErrorResponse } from '@/lib/api';
import { destroySession, getSessionUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

/**
 * End the AfriPuente session.
 *
 * Clears our cookie only. The caller is also expected to call the Pollar SDK's
 * own `logout()` in the browser, because that session lives in browser storage
 * and is bound to a DPoP keypair we cannot touch from the server.
 */
export async function POST() {
  try {
    const user = await getSessionUser().catch(() => null);

    if (user) {
      await db.auditEvent
        .create({
          data: { actorType: 'USER', actorUserId: user.id, action: 'auth.signed_out' },
        })
        // Signing out must succeed even if the audit write fails — never trap a
        // user in a session because the database is briefly unavailable.
        .catch(() => undefined);
    }

    await destroySession();
    return ok({ signedOut: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
