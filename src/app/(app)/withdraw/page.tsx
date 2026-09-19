import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/session';
import { WalletWithdrawal } from '@/components/wallet-withdrawal';

export const metadata: Metadata = { title: 'Wallet withdrawal' };
export default async function WithdrawPage() {
  const user = await getSessionUser();
  return <WalletWithdrawal signedIn={Boolean(user)} />;
}
