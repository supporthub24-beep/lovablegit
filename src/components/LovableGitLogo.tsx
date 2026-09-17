import { cn } from "@/lib/utils";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

/**
 * Bold, symbol-only mark for Lovable Git.
 *
 * The silhouette is a sharp angular "L" fused with a git branch node — a
 * high-contrast geometric shape that stays legible down to favicon size.
 * Everything is drawn with `currentColor` so the mark inherits the
 * surrounding text colour and keeps contrast on both light and dark
 * backgrounds. No lettering is baked into the artwork; the product name is
 * always rendered as live text next to the mark.
 */
export function LovableGitLogo({
  className,
  showWordmark = true,
  title = "Lovable Git",
}: LovableGitLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={title}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="h-7 w-7 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <title>{title}</title>
        <defs>
          <linearGradient id="lovableGitMark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Angular plate — aggressive chamfered silhouette */}
        <path
          d="M32 2 58 16v32L32 62 6 48V16L32 2Z"
          fill="url(#lovableGitMark)"
        />
        {/* Bold "L" stroke carved out of the plate */}
        <path
          d="M22 18v22h20"
          fill="none"
          stroke="var(--color-background)"
          strokeWidth="7"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Git branch node — high-contrast accent dot */}
        <circle
          cx="42"
          cy="40"
          r="6"
          fill="var(--color-background)"
        />
        <circle cx="42" cy="40" r="3" fill="currentColor" />
      </svg>
      {showWordmark ? (
        <span className="text-sm font-bold tracking-tight text-foreground">
          Lovable Git
        </span>
      ) : null}
    </span>
  );
}

export default LovableGitLogo;
