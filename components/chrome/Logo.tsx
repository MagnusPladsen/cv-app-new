/**
 * The CVApp mark. Kept in step with `app/icon.svg` by
 * `components/chrome/__tests__/logo.test.tsx`, which compares the path data:
 * a favicon that has drifted from the logo on the page is the kind of thing
 * nobody notices and everybody sees.
 *
 * The letters are drawn as paths rather than <text> so they do not depend on
 * a font being available - the same reason the icon file does.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="currentColor" height="64" rx="13" width="64" />
      <g
        stroke="var(--brand-ink, #ffffff)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7.5"
      >
        <path d="M28.6 22.6 A11 11 0 1 0 28.6 41.4" />
        <path d="M37.5 21 L45.5 43 L53.5 21" />
      </g>
    </svg>
  )
}
