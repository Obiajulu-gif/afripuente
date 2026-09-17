'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Send, ListOrdered, ShieldCheck } from 'lucide-react';
import { cn } from '@/components/ui';
import type { NavItem } from '@/lib/nav';

// Rendering only. The item list itself is built server-side (src/lib/nav.ts)
// and passed in as a prop.

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

/** Desktop sidebar list. */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              't-fast flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium',
              active
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
            )}
          >
            <Icon size={18} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile navigation: a fixed bottom bar. Chosen over a drawer because these are
 * few, frequent destinations and a bar needs no open/close state to reach them.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
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
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
                  active ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
                )}
              >
                <Icon size={20} aria-hidden />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span aria-hidden className="h-0.5 w-6 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
