import Link from "next/link";
import type { PublicThreadSummary } from "../api-client";

// PRD 11 §7 — the caller's own inbox: mobile-first list of threads, other
// party's name, unread badge (§7's "same source of truth as the Today
// dashboard" — this list and the badge both read straight off the backend's
// unreadCount, nothing recomputed client-side).
export function ThreadList({
  threads,
  viewerRole,
}: {
  threads: PublicThreadSummary[];
  viewerRole: "PROFESSIONAL" | "CLIENT";
}) {
  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma conversa ainda — uma conversa aparece aqui assim que você tiver um
        vínculo ativo.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => {
        const other = viewerRole === "PROFESSIONAL" ? thread.client : thread.professional;
        return (
          <li key={thread.id}>
            <Link
              href={`/messages/${thread.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-muted"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{other.fullName}</p>
                {thread.status === "READ_ONLY" ? (
                  <p className="text-xs text-muted-foreground">
                    Vínculo encerrado — somente leitura
                  </p>
                ) : null}
              </div>
              {thread.unreadCount > 0 ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  {thread.unreadCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
