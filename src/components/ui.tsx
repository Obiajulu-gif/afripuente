import type { ReactNode } from 'react';

// Shared presentational primitives. No payment logic lives here — these take
// already-computed values and render them. Every control meets a 44px touch
// target and inherits the focus ring from globals.css.

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Button -- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
};

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold t-fast disabled:cursor-not-allowed disabled:opacity-55';

const BTN_SIZE = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

const BTN_VARIANT = {
  // Mint always carries dark ink — high contrast on both surfaces.
  primary: 'bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]',
  secondary:
    'border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]',
  ghost: 'text-[var(--text)] hover:bg-[var(--surface-2)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && 'w-full', className)}
      {...props}
    />
  );
}

/** Anchor styled as a button, for real navigation (keeps middle-click, etc.). */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  full,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof BTN_VARIANT;
  size?: keyof typeof BTN_SIZE;
  full?: boolean;
}) {
  return (
    <a
      className={cn(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && 'w-full', className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Card -- */

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <As
      className={cn(
        'rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </As>
  );
}

/* ----------------------------------------------------------------- Badge -- */

export type Tone = 'neutral' | 'pending' | 'success' | 'danger' | 'info' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
  pending: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  success: 'bg-[var(--ok-soft)] text-[var(--ok)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  brand: 'bg-[var(--accent)] text-[var(--accent-ink)]',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Status is communicated by TEXT plus a tone — never by colour alone, so it
 * survives greyscale, colour-blindness and screen readers.
 */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <Badge tone={tone}>{label}</Badge>;
}

/* ----------------------------------------------------------------- Forms -- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  suffix,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  suffix?: ReactNode;
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text)]">
          {label}
        </label>
        {suffix}
      </div>
      {children}
      {hint && !error && (
        <p id={describedBy} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={describedBy} role="alert" className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  'min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--text)] t-fast placeholder:text-[var(--text-muted)]';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL, className)} />;
}

/* -------------------------------------------------------------- Feedback -- */

export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl p-4', TONE_CLASS[tone])} role={tone === 'danger' ? 'alert' : undefined}>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-lg bg-[var(--surface-2)]', className)}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      {action}
    </div>
  );
}

/**
 * A value that could not be read. Deliberately distinct from zero: showing "0"
 * for a failed balance request would be a lie about someone's money.
 */
export function Unavailable({ label = 'Unavailable', onRetry }: { label?: string; onRetry?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <span aria-hidden>—</span>
      <span>{label}</span>
      {onRetry}
    </span>
  );
}

/* --------------------------------------------------------------- Layout --- */

export function Row({
  label,
  value,
  emphasis,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span
        className={cn(
          'tnum text-right text-sm',
          emphasis ? 'text-base font-semibold text-[var(--text)]' : 'font-medium text-[var(--text)]',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium text-[var(--text)]">{summary}</summary>
      <div className="mt-3 space-y-2 text-xs break-words text-[var(--text-muted)]">{children}</div>
    </details>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
