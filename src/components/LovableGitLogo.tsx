import { cn } from "@/lib/utils";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

export function LovableGitLogo({
  className,
  showWordmark = true,
  title = "Lovable Git",
}: LovableGitLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={showWordmark ? "0 0 240 64" : "0 0 64 64"}
      role="img"
      aria-label={title}
      className={cn("h-8 w-auto text-foreground", className)}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="lovableGitMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 8c-6 0-10 4-10 9 0 3 1 5 3 7-4 1-7 4-7 9v3" />
        <path d="M32 8c6 0 10 4 10 9 0 3-1 5-3 7 4 1 7 4 7 9v3" />
        <circle cx="32" cy="17" r="3.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="40" r="4" fill="currentColor" stroke="none" />
        <circle cx="46" cy="40" r="4" fill="currentColor" stroke="none" />
        <path d="M18 40h28" />
      </g>
      <path
        d="M32 26c-3.5 0-6 2.5-6 6 0 2 1 3.5 2.5 4.5L32 44l3.5-7.5C37 35.5 38 34 38 32c0-3.5-2.5-6-6-6Z"
        fill="url(#lovableGitMark)"
      />
      {showWordmark ? (
        <text
          x="72"
          y="41"
          fill="currentColor"
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontSize="26"
          fontWeight="600"
          letterSpacing="-0.5"
        >
          Lovable Git
        </text>
      ) : null}
    </svg>
  );
}

export default LovableGitLogo;
