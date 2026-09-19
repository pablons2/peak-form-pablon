import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn/ui helper — merges conditional classNames and resolves
// Tailwind class conflicts (e.g. "p-2 p-4" -> "p-4"). Every generated
// shadcn component imports this; keep it here so packages/ui stays the
// single place component source lives (decision 3.8 in
// docs/prds/00-shared-reference-and-decisions.md).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
