import { Skeleton } from "@peakform/ui";

export default function PlansLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-7 w-32" />

      <Skeleton className="h-10 w-32 rounded-md" />

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
