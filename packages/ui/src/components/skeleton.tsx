import * as React from "react";
import { cn } from "../lib/utils";

// Scaffolded per docs/redesign-plan.md §5.1 — its first real screen consumer
// (route-level loading.tsx skeletons, §5.6) lands in a later redesign phase.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
