import { cn } from "@/lib/utils";

type AdminLogoProps = {
  className?: string;
  /** Accessible label for the mark. Pass an empty string when the logo is decorative. */
  label?: string;
  /** Renders the wordmark next to the mark. */
  showWordmark?: boolean;
};

/**
 * Theme-aware admin logo mark.
 *
 * Uses `currentColor` for the strokes so the mark inherits the surrounding
 * text colour and therefore stays legible in both light and dark themes.
 * The accent plate uses the project's primary token so it follows the theme.
 */
export function AdminLogo({
  className,
  label = "Admin panel",
  showWordmark = true,
}: AdminLogoProps) {
  const decorative = label === "";

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Accent plate — follows the theme primary token */}
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="9"
          className="fill-primary"
        />
        {/* Shield silhouette — inherits currentColor from the parent */}
        <path
          d="M16 6.5 24 9.4v6.1c0 4.6-3.1 8.6-8 10-4.9-1.4-8-5.4-8-10V9.4L16 6.5Z"
          className="stroke-primary-foreground"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Check / control glyph */}
        <path
          d="m12.4 16.2 2.6 2.6 4.9-5.2"
          className="stroke-primary-foreground"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Admin
        </span>
      ) : null}
    </span>
  );
}

export default AdminLogo;
