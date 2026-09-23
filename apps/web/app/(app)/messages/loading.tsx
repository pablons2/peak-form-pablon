import { Skeleton } from "@peakform/ui";

export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-7 w-32" />

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
