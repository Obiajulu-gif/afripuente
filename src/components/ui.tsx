import type { ReactNode } from 'react';

// Small local primitives in the shadcn/ui spirit (composable, class-driven)
// without pulling the generator. Touch targets are >= 44px, focus rings come
// from globals.css, and every colour is a theme token.

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = { md: 'min-h-11 px-4 text-sm', lg: 'min-h-13 px-6 text-base w-full sm:w-auto' };
  const variants = {
    primary: 'bg-[var(--teal)] text-white hover:bg-[var(--teal-strong)]',
    secondary:
      'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
    ghost: 'text-[var(--teal)] hover:bg-[var(--teal-soft)]',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90',
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export type Tone = 'neutral' | 'pending' | 'success' | 'danger' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-muted)] text-[var(--muted)]',
  pending: 'bg-[var(--amber-soft)] text-[var(--amber)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--teal-soft)] text-[var(--teal)]',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base',
        'placeholder:text-[var(--muted)]',
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base',
        props.className,
      )}
    />
  );
}

/** Technical detail stays available but out of the way. */
export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{summary}</summary>
      <div className="mt-3 space-y-2 text-xs text-[var(--muted)]">{children}</div>
    </details>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}) {
  const border: Record<Tone, string> = {
    neutral: 'border-[var(--border)]',
    pending: 'border-[var(--amber)]/40',
    success: 'border-[var(--success)]/40',
    danger: 'border-[var(--danger)]/40',
    info: 'border-[var(--teal)]/30',
  };
  return (
    <div className={cn('rounded-xl border p-4', border[tone], TONE_CLASS[tone])}>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
