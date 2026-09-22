import Link from "next/link";
import { ThreadList } from "../../messaging/components/thread-list";
import type { PublicThreadSummary } from "../../messaging/api-client";

// PRD 09 §5.1 — unread count/preview. Reuses ThreadList verbatim (PRD 11
// §7's own inbox component) so the badge counts can never drift between
// this card and /messages itself — both read the same unreadCount field.
export function TodayMessagesCard({
  unreadTotal,
  unreadThreads,
}: {
  unreadTotal: number;
  unreadThreads: PublicThreadSummary[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Mensagens</h2>
        <Link href="/messages" className="text-sm text-accent hover:underline">
          Ver todas
        </Link>
      </div>
      {unreadTotal === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nenhuma mensagem não lida.</p>
      ) : (
        <div className="mt-2">
          <ThreadList threads={unreadThreads} viewerRole="CLIENT" />
        </div>
      )}
    </div>
  );
}
