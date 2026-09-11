import { cn } from "@/lib/utils";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

export function LovableGitLogo({
  className,
  showWordmark = true,
  title = "lovablegit",
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
        <linearGradient
          id="lovablegitLogoMark"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 12v26a10 10 0 0 0 10 10h6" />
        <circle cx="20" cy="10" r="4" fill="currentColor" stroke="none" />
        <circle cx="38" cy="48" r="4" fill="currentColor" stroke="none" />
        <path d="M44 20a10 10 0 0 1 10 10v6" />
        <circle cx="54" cy="40" r="4" fill="currentColor" stroke="none" />
      </g>
      <path
        d="M30 30c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"
        fill="url(#lovablegitLogoMark)"
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
          lovablegit
        </text>
      ) : null}
    </svg>
  );
}

export default LovableGitLogo;
