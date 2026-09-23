import { Skeleton } from "@peakform/ui";

export default function ClientDetailLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-12" />
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 flex-1 rounded-md" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </div>

      <Skeleton className="h-32 rounded-lg" />
    </main>
  );
}
