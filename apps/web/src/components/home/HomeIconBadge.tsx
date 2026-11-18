import { getIcon } from "@/data/homeContent";
import { cn } from "@/lib/utils";

/** Configured home icon on a tinted square so it stays visible on any section tone. */
export function HomeIconBadge({ icon, className }: { icon: string; className?: string }) {
  const Icon = getIcon(icon);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
