import { Skeleton } from "@peakform/ui";

export default function ClientsLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-7 w-24" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
