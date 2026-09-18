import 'server-only';
import { env } from '@/lib/env';

/**
 * Documented sandbox account. Deliberately unmistakable: "0000000000" is not a
 * valid NUBAN, so it cannot be transcribed into a banking app by accident.
 */
const SANDBOX_PARTNER = {
  name: 'AfriPuente Test Partner (sandbox)',
  bank: 'Sandbox Bank — test environment',
  account: '0000000000',
} as const;

export type FundingTone = 'live' | 'sandbox' | 'simulated';

export interface FundingInstructions {
  mode: string;
  /** True ONLY when this is a real account that really receives money. */
  isReal: boolean;
  tone: FundingTone;
  title: string;
  partnerName: string;
  bankName: string;
  accountNumber: string;
  reference: string;
  warning: string | null;
}

/**
 * Nigerian funding instructions, one behaviour per mode.
 *
 *   LIVE      a real partner account. `env` refuses to boot in this mode
 *             unless all three partner values are set, so this can never
 *             render a blank "real" account.
 *   SANDBOX   a labelled test account, so a demo shows the complete screen
 *             without anyone mistaking it for somewhere to send money.
 *   SIMULATED no account at all — the safest default.
 *
 * The one rule across all three: never render a plausible-looking account
 * number unless money really will arrive there.
 */
export function buildFundingInstructions(reference: string): FundingInstructions {
  const mode = env.NGN_FUNDING_MODE;

  if (mode === 'LIVE') {
    return {
      mode,
      isReal: true,
      tone: 'live',
      title: 'Pay by bank transfer',
      partnerName: env.NGN_PARTNER_NAME,
      bankName: env.NGN_PARTNER_BANK,
      accountNumber: env.NGN_PARTNER_ACCOUNT,
      reference,
      warning: null,
    };
  }

  if (mode === 'SANDBOX') {
    // Operator-supplied test details when present, otherwise the documented
    // sandbox account above.
    return {
      mode,
      isReal: false,
      tone: 'sandbox',
      title: 'Test account — no money moves',
      partnerName: env.NGN_PARTNER_NAME || SANDBOX_PARTNER.name,
      bankName: env.NGN_PARTNER_BANK || SANDBOX_PARTNER.bank,
      accountNumber: env.NGN_PARTNER_ACCOUNT || SANDBOX_PARTNER.account,
      reference,
      warning:
        'These are sandbox details for demonstrating the flow. No bank account receives this payment and no money moves. An operator still reconciles the transfer so you can walk through the full journey.',
    };
  }

  return {
    mode,
    isReal: false,
    tone: 'simulated',
    title: 'Sandbox — do not send money',
    partnerName: 'SANDBOX — no real partner configured',
    bankName: 'SANDBOX — do not send money',
    accountNumber: 'NO ACCOUNT — SANDBOX MODE',
    reference,
    warning:
      'This is a sandbox funding instruction. There is no account to pay and no money will move. Do not attempt a real bank transfer.',
  };
}
