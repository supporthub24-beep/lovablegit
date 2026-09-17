import { cn } from "@/lib/utils";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

/**
 * Brand mark for Lovable Git.
 *
 * Renders the transparent PNG version of the mark so the artwork stays
 * identical to the original SVG design at every size. The product name is
 * always rendered as live text next to the mark, never baked into the image.
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
      <img
        src="/generated/f78323f2-055-supporthub24-logo.jpg"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 object-contain"
        aria-hidden="true"
        draggable={false}
      />
      {showWordmark ? (
        <span className="text-sm font-bold tracking-tight text-foreground">
          Lovable Git
        </span>
      ) : null}
    </span>
  );
}

export default LovableGitLogo;
