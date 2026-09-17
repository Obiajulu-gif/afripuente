// Navigation definition. Deliberately framework-neutral and free of 'use client'
// so the server layout can build the list and pass it to client components —
// a function exported from a client module cannot be called on the server.

export type NavIcon = 'overview' | 'send' | 'activity' | 'operator';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

/**
 * Navigation is kept small: three destinations, plus the operator workspace for
 * operators only. Hiding that entry is presentation — authority is re-checked
 * server-side on the operator page and in every operator API route.
 */
export function navItems(isOperator: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: 'overview' },
    { href: '/send', label: 'Send payment', icon: 'send' },
    { href: '/activity', label: 'Activity', icon: 'activity' },
  ];
  if (isOperator) items.push({ href: '/operator', label: 'Operator', icon: 'operator' });
  return items;
}
