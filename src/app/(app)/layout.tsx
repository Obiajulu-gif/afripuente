import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { AccountMenu } from '@/components/app-shell/account-menu';
import { MobileNav, SidebarNav } from '@/components/app-shell/app-nav';
import { getSessionUser } from '@/lib/auth/session';
import { navItems } from '@/lib/nav';
import { Search, Send, Activity } from 'lucide-react';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);

  if (!user) {
    return <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">{children}</div>;
  }

  const items = navItems(user.role === 'OPERATOR');

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-dvh max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-[var(--line)] bg-[var(--sidebar-bg)] pl-4 py-4 pr-0 lg:flex overflow-visible z-20">
          <div className="pr-4">
            {/* Logo matching School Suite style */}
            <div className="mb-8 px-2 pt-2">
              <Link href="/" className="inline-flex items-center gap-2" aria-label="AfriPuente home">
                <Wordmark />
              </Link>
            </div>

            {/* Nav list */}
            <SidebarNav items={items} />
          </div>

          <div className="space-y-4 pt-4 pr-4 border-t border-white/10">
            <div className="px-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>© 2026 AfriPuente</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-[var(--accent)]">
                v0.1.0 • {process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet'}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <div className="min-w-0 flex-1 flex flex-col bg-[var(--bg)]">
          {/* Top header bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3">
              <Link href="/" aria-label="AfriPuente home">
                <Wordmark markSize={24} />
              </Link>
            </div>

            {/* Desktop search bar (Matching reference design) */}
            <div className="hidden sm:flex items-center relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors shadow-xs"
                readOnly
              />
            </div>

            {/* Header Right Actions (Search, Theme Icon, Profile Avatar Chip) */}
            <div className="flex items-center gap-3 ml-auto">
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Stellar {process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </span>

              {/* Profile Header Chip (Matching Reference Image) */}
              <AccountMenu email={user.email} role={user.role} variant="header" />
            </div>
          </header>

          <main id="main" className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>
      </div>

      <MobileNav items={items} />
    </div>
  );
}
