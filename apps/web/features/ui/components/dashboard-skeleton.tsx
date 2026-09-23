import { Skeleton } from "@peakform/ui";

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </main>
  );
}

export function CardGridSkeleton() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <Skeleton className="h-8 w-40" />

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}

export function TabsSkeleton() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <Skeleton className="h-8 w-32" />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </main>
  );
}

export function ListSkeleton() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <Skeleton className="h-8 w-40" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}

export function DetailHubSkeleton() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <Skeleton className="h-8 w-48" />

      <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </main>
  );
}
