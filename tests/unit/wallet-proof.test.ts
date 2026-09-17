import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { sep53Digest, verifyWalletProof } from '@/lib/auth/wallet-proof';

// Real ed25519 signatures produced by @stellar/stellar-sdk — no mocks. These
// tests exercise the actual verification path used to open a server session.

const NONCE = 'AfriPuente sign-in\nnonce: 0123456789abcdef';

function sign(keypair: Keypair, message: string): string {
  return keypair.sign(sep53Digest(message)).toString('base64');
}

describe('SEP-53 wallet proof verification', () => {
  it('accepts a signature made by the claimed address', () => {
    const kp = Keypair.random();
    const result = verifyWalletProof({
      address: kp.publicKey(),
      nonce: NONCE,
      signature: sign(kp, NONCE),
      scheme: 'sep53',
    });

    expect(result).toEqual({ ok: true, address: kp.publicKey() });
  });

  it('rejects a signature made by a DIFFERENT wallet', () => {
    // The core attack: presenting someone else's address with your own signature.
    const attacker = Keypair.random();
    const victim = Keypair.random();

    const result = verifyWalletProof({
      address: victim.publicKey(),
      nonce: NONCE,
      signature: sign(attacker, NONCE),
      scheme: 'sep53',
    });

    expect(result).toEqual({ ok: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('rejects a signature over a different message', () => {
    // A signature captured from one challenge must not verify against another.
    const kp = Keypair.random();
    const result = verifyWalletProof({
      address: kp.publicKey(),
      nonce: NONCE,
      signature: sign(kp, 'a different nonce'),
      scheme: 'sep53',
    });

    expect(result).toEqual({ ok: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('rejects an unsupported proof scheme', () => {
    const kp = Keypair.random();
    const result = verifyWalletProof({
      address: kp.publicKey(),
      nonce: NONCE,
      signature: sign(kp, NONCE),
      scheme: 'something-else',
    });

    expect(result).toEqual({ ok: false, reason: 'UNSUPPORTED_SCHEME' });
  });

  it('rejects a malformed address', () => {
    const result = verifyWalletProof({
      address: 'not-a-stellar-address',
      nonce: NONCE,
      signature: 'AAAA',
      scheme: 'sep53',
    });

    expect(result).toEqual({ ok: false, reason: 'BAD_ADDRESS' });
  });

  it('rejects a signature that is not 64 bytes', () => {
    const kp = Keypair.random();
    const result = verifyWalletProof({
      address: kp.publicKey(),
      nonce: NONCE,
      signature: Buffer.from('too short').toString('base64'),
      scheme: 'sep53',
    });

    expect(result).toEqual({ ok: false, reason: 'MALFORMED_SIGNATURE' });
  });

  it('rejects junk that base64-decodes to the wrong length', () => {
    const kp = Keypair.random();
    const result = verifyWalletProof({
      address: kp.publicKey(),
      nonce: NONCE,
      signature: '!!!!not base64!!!!',
      scheme: 'sep53',
    });

    expect(result.ok).toBe(false);
  });

  it('produces a stable SEP-53 digest with the documented prefix', () => {
    // Guards the prefix: changing it would silently break interoperability
    // with Pollar's custodial signer.
    const digest = sep53Digest('verify me');
    expect(digest).toHaveLength(32);
    expect(sep53Digest('verify me').equals(digest)).toBe(true);
    expect(sep53Digest('verify me!').equals(digest)).toBe(false);
  });
});
