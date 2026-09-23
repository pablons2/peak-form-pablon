import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

// Scaffolded per docs/redesign-plan.md §5.1 — its first real screen consumer
// (replacing the plain gray "Nenhum ... ainda." sentences, §3.7/§5.6) lands
// in a later redesign phase.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="h-8 w-8 text-muted-foreground" aria-hidden /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
