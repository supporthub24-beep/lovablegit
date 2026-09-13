import { cn } from "@/lib/utils";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

export function LovableGitLogo({
  className,
  showWordmark = true,
  title = "SupportHub24",
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
          id="supportHubLogoMark"
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
        <path d="M14 16h28a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8H28l-10 8v-8h-4a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8Z" />
        <circle cx="22" cy="29" r="3" fill="currentColor" stroke="none" />
        <circle cx="32" cy="29" r="3" fill="currentColor" stroke="none" />
        <circle cx="42" cy="29" r="3" fill="currentColor" stroke="none" />
      </g>
      <path
        d="M28 22c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"
        fill="url(#supportHubLogoMark)"
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
          SupportHub24
        </text>
      ) : null}
    </svg>
  );
}

export default LovableGitLogo;
