import type { CheckInSchedule } from "../api-client";
import { CheckInItem } from "./check-in-item";
import { CreateCheckInForm } from "./create-check-in-form";

// PRD 02 §7 — "Check-ins" panel: active/fired/cancelled schedules for one
// link, plus (Professional only) the quick-create form. canManage gates
// edit/cancel and the create form — the Client's view of the same list is
// read-only (§4).
export function CheckInsPanel({
  linkId,
  schedules,
  canManage,
}: {
  linkId: string;
  schedules: CheckInSchedule[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum check-in agendado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((schedule) => (
            <CheckInItem
              key={schedule.id}
              linkId={linkId}
              schedule={schedule}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
      {canManage ? (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Novo lembrete</h3>
          <div className="mt-2">
            <CreateCheckInForm linkId={linkId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
