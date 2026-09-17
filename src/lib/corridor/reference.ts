import { randomBytes } from 'node:crypto';

// Bank narration references. Human-transcribable: no 0/O/1/I/L, grouped in
// fours, because a sender types this into a banking app by hand and a
// mistyped reference is a reconciliation failure.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function code(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** e.g. "APX-4KDM-9TQW" */
export function generateReference(): string {
  return `APX-${code(4)}-${code(4)}`;
}

/** Mask an account identifier for display. Full details never leave the server. */
export function maskAccount(value: string): string {
  const trimmed = value.replace(/\s+/g, '');
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`;
}
