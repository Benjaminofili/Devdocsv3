/**
 * Custom DevDocs V2 icon — a stylized document with code angle-brackets.
 * Renders as an inline SVG so it can be used at any size, in the header,
 * and also serialised to a data-URI for the favicon.
 */

interface DevDocsIconProps {
  size?: number;
  className?: string;
}

export function DevDocsIcon({ size = 32, className }: DevDocsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background rounded square */}
      <rect width="64" height="64" rx="14" fill="url(#dd-bg)" />

      {/* Folded document shape */}
      <path
        d="M18 14h18l10 10v26a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"
        fill="rgba(255,255,255,0.12)"
      />
      <path
        d="M36 14v6a4 4 0 0 0 4 4h6"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Code angle brackets  < / >  */}
      <path
        d="M25 32l-5 5 5 5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 32l5 5-5 5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 29l-6 16"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="dd-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Returns the SVG icon markup as a raw string (no React wrapper).
 * Used to build a data-URI for the browser favicon.
 */
export function getDevDocsIconSVG(): string {
  return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="14" fill="url(%23dd-bg)"/>
    <path d="M18 14h18l10 10v26a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" fill="rgba(255,255,255,0.12)"/>
    <path d="M36 14v6a4 4 0 0 0 4 4h6" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round"/>
    <path d="M25 32l-5 5 5 5" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M39 32l5 5-5 5" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M35 29l-6 16" stroke="rgba(255,255,255,0.55)" stroke-width="2.2" stroke-linecap="round"/>
    <defs><linearGradient id="dd-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="%236366f1"/><stop offset="1" stop-color="%238b5cf6"/></linearGradient></defs>
  </svg>`;
}
