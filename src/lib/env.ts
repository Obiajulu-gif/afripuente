import 'server-only';
import { z } from 'zod';

// Server-side environment. Importing this from a Client Component is a build
// error, which is the point: secrets cannot leak into the bundle.
//
// Validation is LAZY — it runs on first property access, not at import.
// Building the app should not require production secrets: `next build` imports
// every route module to collect page data, so eager validation made a build
// impossible without a full secret set. The check itself is unchanged and still
// throws loudly; it simply happens when a request actually needs a value.

const schema = z.object({
  DATABASE_URL: z.string().url(),

  POLLAR_SECRET_KEY: z.string().startsWith('sec_'),
  POLLAR_PAT: z.string().startsWith('pat_').optional(),
  POLLAR_APP_ID: z.string().min(1),

  STELLAR_HORIZON_URL: z.string().url(),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  NGN_FUNDING_MODE: z.enum(['SIMULATED', 'SANDBOX', 'LIVE']).default('SIMULATED'),
  NGN_PARTNER_NAME: z.string().default(''),
  NGN_PARTNER_BANK: z.string().default(''),
  NGN_PARTNER_ACCOUNT: z.string().default(''),

  NGN_PER_USD_INDICATIVE: z.string().regex(/^\d+(\.\d+)?$/, 'must be a decimal string'),
  NGN_FUNDING_FEE_BPS: z.coerce.number().int().min(0).max(10_000),

  /// Indicative BOB per 1 USDC, used ONLY to show an estimate before a real
  /// provider quote exists. A provider quote always overrides it.
  BOB_PER_USD_INDICATIVE: z.string().regex(/^\d+(\.\d+)?$/, 'must be a decimal string'),

  OPERATOR_EMAILS: z.string().default(''),
  OPERATOR_WALLETS: z.string().default(''),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(
      `Invalid server environment:\n${issues}\n\n` +
        'Set these in .env.local for local development, or in the hosting ' +
        'provider for a deployment. See .env.example.',
    );
  }

  // The declared Stellar network and the Horizon server must agree.
  //
  // This is not cosmetic. Horizon is how the app INDEPENDENTLY verifies that a
  // settlement really happened: the right asset, destination and amount. Point a
  // mainnet app at testnet Horizon and every real transaction looks missing,
  // while a worthless testnet transaction could be offered as proof of a real
  // payment. A mismatch makes the verification meaningless, so refuse to run.
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error('NEXT_PUBLIC_STELLAR_NETWORK must be mainnet or testnet.');
  }
  for (const [name, prefix] of [
    ['NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY', 'pub'],
    ['POLLAR_SECRET_KEY', 'sec'],
  ] as const) {
    const key = process.env[name];
    if (key && !key.startsWith(`${prefix}_${network}_`)) {
      throw new Error(`Network mismatch: ${name} must be a ${network} key.`);
    }
  }
  const horizonIsTestnet = /horizon-testnet\./i.test(parsed.data.STELLAR_HORIZON_URL);

  if (network === 'mainnet' && horizonIsTestnet) {
    throw new Error(
      'Network mismatch: NEXT_PUBLIC_STELLAR_NETWORK=mainnet but STELLAR_HORIZON_URL ' +
        `is a testnet server (${parsed.data.STELLAR_HORIZON_URL}). ` +
        'Use https://horizon.stellar.org, or settlement verification will look for ' +
        'real transactions on the test ledger and never find them.',
    );
  }
  if (network !== 'mainnet' && !horizonIsTestnet) {
    throw new Error(
      `Network mismatch: NEXT_PUBLIC_STELLAR_NETWORK=${network} but STELLAR_HORIZON_URL ` +
        `is not a testnet server (${parsed.data.STELLAR_HORIZON_URL}). ` +
        'Use https://horizon-testnet.stellar.org.',
    );
  }

  // A LIVE Nigerian funding leg must name a real partner and account, or the UI
  // would render an empty "real" collection account. Fail rather than show one.
  if (parsed.data.NGN_FUNDING_MODE === 'LIVE') {
    const { NGN_PARTNER_NAME, NGN_PARTNER_BANK, NGN_PARTNER_ACCOUNT } = parsed.data;
    if (!NGN_PARTNER_NAME || !NGN_PARTNER_BANK || !NGN_PARTNER_ACCOUNT) {
      throw new Error(
        'NGN_FUNDING_MODE=LIVE requires NGN_PARTNER_NAME, NGN_PARTNER_BANK and NGN_PARTNER_ACCOUNT.',
      );
    }
  }

  cached = parsed.data;
  return cached;
}

/** Validated server environment. Reading any property validates on first use. */
export const env = new Proxy({} as Env, {
  get: (_t, prop: string) => load()[prop as keyof Env],
  has: (_t, prop: string) => prop in load(),
  ownKeys: () => Reflect.ownKeys(load()),
  getOwnPropertyDescriptor: (_t, prop: string) =>
    Object.getOwnPropertyDescriptor(load(), prop) ?? {
      configurable: true,
      enumerable: true,
      value: load()[prop as keyof Env],
    },
});

/** Emails granted the OPERATOR role at sign-in. Read at call time, not import. */
export function operatorEmails(): string[] {
  return load()
    .OPERATOR_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Public wallets explicitly authorised by the server operator, never client email claims. */
export function isOperatorWallet(address: string, network: string): boolean {
  return load().OPERATOR_WALLETS.split(',').map((v) => v.trim()).includes(`${network}:${address}`);
}
