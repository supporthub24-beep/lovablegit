import { cn } from "@/lib/utils";
import forgeLogo from "@/assets/forge-logo.png";

type LovableGitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

/**
 * Forge brand mark and wordmark.
 */
export function LovableGitLogo({
  className,
  showWordmark = true,
  title = "Forge",
}: LovableGitLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={title}
    >
      <img
        src={forgeLogo}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 object-contain drop-shadow-[0_0_8px_color-mix(in_oklch,var(--color-primary)_28%,transparent)]"
        aria-hidden="true"
        draggable={false}
      />
      {showWordmark ? (
        <span className="text-sm font-bold tracking-tight text-foreground">
          Forge
        </span>
      ) : null}
    </span>
  );
}

export default LovableGitLogo;
