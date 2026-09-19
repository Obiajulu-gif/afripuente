'use client';

import { useRouter } from 'next/navigation';
import { usePollar } from '@pollar/react';
import { Button, Card, Notice } from '@/components/ui';
import { SignInPanel } from '@/components/sign-in-panel';

export function WalletWithdrawal({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { isAuthenticated, verified, wallet, openRampModal, openReceiveModal, openWalletBalanceModal, openTxHistoryModal } = usePollar();
  const ready = signedIn && isAuthenticated && verified && Boolean(wallet?.address);
  const mainnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet';
  return <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
    <div><h1 className="text-2xl font-semibold">Withdraw from your wallet</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Convert a supported wallet asset to a bank payout through Pollar.</p></div>
    <Notice tone="pending" title={mainnet ? 'Mainnet · real funds' : 'Testnet · test funds'}>
      This uses your existing wallet balance. A sandbox NGN transfer does not fund this wallet. Review the asset, fees, destination and final amount in Pollar before approving.
    </Notice>
    {!ready && <SignInPanel onSignedIn={() => router.refresh()} />}
    <Card className="space-y-4">
      <h2 className="font-semibold">Your wallet</h2>
      {ready && <p className="break-all font-mono text-xs">{wallet?.address}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!ready} onClick={openWalletBalanceModal}>Check balance</Button>
        <Button variant="secondary" disabled={!ready} onClick={openReceiveModal}>Receive funds</Button>
        <Button variant="secondary" disabled={!ready} onClick={openTxHistoryModal}>Wallet history</Button>
      </div>
    </Card>
    <Card className="space-y-4">
      <h2 className="font-semibold">Withdraw to Bolivia</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
        <li>Open Pollar and choose Sell, then Bolivia (BOB).</li>
        <li>Choose an available route and an asset you hold. Check the current quote and fees.</li>
        <li>Enter the account holder and bank details requested by the provider. Complete any identity or terms checks.</li>
        <li>Review and authorize in Pollar. Follow its instructions and keep the order reference until the provider confirms completion.</li>
      </ol>
      <Button size="lg" disabled={!ready} onClick={openRampModal}>Open Pollar withdrawal</Button>
      <p className="text-xs text-[var(--muted)]">Available routes and limits depend on Pollar and the payout provider. Withdrawal orders are managed in Pollar; they do not update your sandbox transfer activity. A wallet transaction alone does not confirm bank receipt.</p>
    </Card>
  </main>;
}
