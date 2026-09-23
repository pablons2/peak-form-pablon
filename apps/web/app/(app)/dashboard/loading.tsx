import { Skeleton } from "@peakform/ui";

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-7 w-32" />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <Skeleton className="h-11 flex-1 rounded-md" />
        <Skeleton className="h-11 flex-1 rounded-md" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </main>
  );
}
