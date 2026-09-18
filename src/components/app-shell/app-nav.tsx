'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Send, ListOrdered, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/ui';
import type { NavItem } from '@/lib/nav';

const ICONS = {
  overview: LayoutDashboard,
  send: Send,
  activity: ListOrdered,
  operator: ShieldCheck,
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar list with exact curved cutout active notch matching reference */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1 pr-0">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-12 items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150',
              active
                ? 'nav-tab-active text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white',
            )}
          >
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center transition-colors',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-white',
                )}
              >
                <Icon size={19} aria-hidden />
              </span>
              <span className="tracking-wide text-sm">{item.label}</span>
            </div>

            {active ? (
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile navigation: sleek fixed bottom bar with glowing active pip.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--sidebar-bg)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
              >
                <Icon size={19} aria-hidden />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span aria-hidden className="h-0.5 w-6 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
