import 'server-only';
import { z } from 'zod';

// Server-side environment. Importing this from a Client Component is a build
// error, which is the point: secrets cannot leak into the bundle.
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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid server environment:\n${issues}`);
}

export const env = parsed.data;

export const operatorEmails = env.OPERATOR_EMAILS.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * A LIVE Nigerian funding leg must name a real partner and account, or the UI
 * would show an empty "real" collection account. Fail at boot instead.
 */
if (env.NGN_FUNDING_MODE === 'LIVE') {
  if (!env.NGN_PARTNER_NAME || !env.NGN_PARTNER_BANK || !env.NGN_PARTNER_ACCOUNT) {
    throw new Error(
      'NGN_FUNDING_MODE=LIVE requires NGN_PARTNER_NAME, NGN_PARTNER_BANK and NGN_PARTNER_ACCOUNT.',
    );
  }
}
