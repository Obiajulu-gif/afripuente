import 'server-only';
import { createHash } from 'node:crypto';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

// Server-side verification of a SEP-53 ownership proof.
//
// This is the mechanism that stops a connected wallet address from being an
// authentication claim on its own. The flow is:
//
//   1. Server issues a single-use nonce bound to the claimed address.
//   2. Client signs it via Pollar: client.stellar.sep53.signMessage(nonce).
//   3. Server verifies the ed25519 signature here and consumes the nonce.
//
// Per the @pollar/core README, `signature` is base64 ed25519 over the SEP-53
// digest SHA-256("Stellar Signed Message:\n" + message), and both external and
// custodial wallets return scheme 'sep53' — so one verifier handles both.

const SEP53_PREFIX = 'Stellar Signed Message:\n';

export interface WalletProof {
  address: string;
  nonce: string;
  signature: string;
  scheme: string;
}

export type ProofFailure =
  | 'BAD_ADDRESS'
  | 'UNSUPPORTED_SCHEME'
  | 'MALFORMED_SIGNATURE'
  | 'SIGNATURE_MISMATCH';

export type ProofResult =
  | { ok: true; address: string }
  | { ok: false; reason: ProofFailure };

/** SHA-256 over the SEP-53 prefixed message. */
export function sep53Digest(message: string): Buffer {
  return createHash('sha256').update(SEP53_PREFIX + message, 'utf8').digest();
}

export function isValidStellarAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

/**
 * Verify a SEP-53 proof. Returns a discriminated result rather than throwing,
 * so callers must handle failure explicitly.
 *
 * The caller is responsible for having issued and not-yet-consumed the nonce —
 * this function proves only that the holder of `address` signed `nonce`.
 */
export function verifyWalletProof(proof: WalletProof): ProofResult {
  if (!isValidStellarAddress(proof.address)) {
    return { ok: false, reason: 'BAD_ADDRESS' };
  }

  // A smart-wallet (C-address) session cannot produce a classic ed25519 proof;
  // Pollar returns an error outcome there rather than a different scheme.
  if (proof.scheme !== 'sep53') {
    return { ok: false, reason: 'UNSUPPORTED_SCHEME' };
  }

  let signature: Buffer;
  try {
    signature = Buffer.from(proof.signature, 'base64');
    // ed25519 signatures are exactly 64 bytes. Buffer.from ignores junk, so
    // this length check is what actually rejects malformed input.
    if (signature.length !== 64) return { ok: false, reason: 'MALFORMED_SIGNATURE' };
  } catch {
    return { ok: false, reason: 'MALFORMED_SIGNATURE' };
  }

  try {
    const keypair = Keypair.fromPublicKey(proof.address);
    const verified = keypair.verify(sep53Digest(proof.nonce), signature);
    return verified ? { ok: true, address: proof.address } : { ok: false, reason: 'SIGNATURE_MISMATCH' };
  } catch {
    return { ok: false, reason: 'SIGNATURE_MISMATCH' };
  }
}
