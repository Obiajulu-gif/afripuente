import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { AccountMenu } from '@/components/app-shell/account-menu';
import { MobileNav, SidebarNav } from '@/components/app-shell/app-nav';
import { getSessionUser } from '@/lib/auth/session';
import { navItems } from '@/lib/nav';

// Shell for the signed-in application. This is a route group, so it adds no URL
// segment — /send, /activity, /operator and /transfers/[id] keep their paths.
//
// The shell only renders for a signed-in user. Anonymous visitors (for example
// hitting /send to sign in) get the bare page, so the sign-in screen is not
// framed by navigation they cannot use yet.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);

  if (!user) {
    return <div className="min-h-dvh bg-[var(--bg)]">{children}</div>;
  }

  const items = navItems(user.role === 'OPERATOR');

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <div className="mx-auto flex max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:flex">
          <div>
            <Link href="/" className="mb-6 inline-flex" aria-label="AfriPuente home">
              <Wordmark />
            </Link>
            <SidebarNav items={items} />
          </div>
          <AccountMenu email={user.email} role={user.role} />
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 lg:hidden">
            <Link href="/" aria-label="AfriPuente home">
              <Wordmark markSize={24} />
            </Link>
            <div className="w-40">
              <AccountMenu email={user.email} role={user.role} />
            </div>
          </header>

          <main id="main" className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>
      </div>

      <MobileNav items={items} />
    </div>
  );
}
