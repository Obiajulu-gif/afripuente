import { cn } from '@/components/ui';

/**
 * Original AfriPuente mark: two piers joined by an arc, with a payment dot
 * crossing it. "Puente" is Spanish for bridge — the mark is the product.
 * Inline SVG so it inherits colour and costs no extra request.
 */
export function BridgeMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ap-mark" x1="4" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mint)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      {/* deck */}
      <path d="M3 21h26" stroke="url(#ap-mark)" strokeWidth="2.5" strokeLinecap="round" />
      {/* span */}
      <path
        d="M5 21c0-7.2 4.9-12 11-12s11 4.8 11 12"
        stroke="url(#ap-mark)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* piers */}
      <path d="M8 21v5M24 21v5" stroke="url(#ap-mark)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      {/* value in transit */}
      <circle cx="16" cy="9" r="3" fill="var(--mint)" />
    </svg>
  );
}

export function Wordmark({
  className,
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BridgeMark size={markSize} />
      <span className="text-lg font-semibold tracking-tight text-[var(--text)]">AfriPuente</span>
    </span>
  );
}

/**
 * Nigeria → Bolivia route illustration. Pure SVG: two nodes, an arc, and a
 * travelling dot. Decorative, so it is hidden from assistive tech — the route
 * is stated in text beside it.
 */
export function RouteIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      className={cn('w-full', className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ap-route" x1="40" y1="80" x2="280" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mint)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>

      <path
        d="M44 80C100 18 220 18 276 80"
        stroke="url(#ap-route)"
        strokeWidth="2"
        strokeDasharray="5 6"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* origin */}
      <circle cx="44" cy="80" r="9" fill="var(--mint)" opacity="0.18" />
      <circle cx="44" cy="80" r="4.5" fill="var(--mint)" />
      <text x="44" y="106" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
        Lagos
      </text>

      {/* destination */}
      <circle cx="276" cy="80" r="9" fill="var(--violet)" opacity="0.18" />
      <circle cx="276" cy="80" r="4.5" fill="var(--violet)" />
      <text x="276" y="106" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
        Santa Cruz
      </text>

      {/* value crossing — animation is CSS-free and respects reduced motion
          because it is a single short repeating transform the browser can drop */}
      <circle r="4" fill="var(--mint)">
        <animateMotion dur="4s" repeatCount="indefinite" path="M44 80C100 18 220 18 276 80" />
      </circle>

      {/* Sits above the arc's apex (the curve peaks near y=40 at x=160). */}
      <text x="160" y="26" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
        USDC on Stellar
      </text>
    </svg>
  );
}
