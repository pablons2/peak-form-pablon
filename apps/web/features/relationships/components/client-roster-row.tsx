"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@peakform/ui";
import { AlertCircle, MessageCircle, Clock } from "lucide-react";
import type { LinkStatus, PublicLink } from "../api-client";
import { unlinkAction } from "../actions";
import { SPECIALIZATION_LABELS, formatDate } from "../labels";

export interface ClientActivitySignals {
  unreadMessageCount?: number;
  hasNoCheckInScheduled?: boolean;
  hasContraindications?: boolean;
  lastActivityAt?: string | null;
}

export function ClientRosterRow({
  link,
  viewerId,
  isSelected = false,
  activitySignals,
}: {
  link: PublicLink;
  viewerId: string;
  isSelected?: boolean;
  activitySignals?: ClientActivitySignals;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initials = link.client.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function unlink() {
    startTransition(async () => {
      await unlinkAction(link.id);
      router.refresh();
    });
  }

  const statusColors: Record<LinkStatus, { bg: string; text: string }> = {
    ACTIVE: { bg: "bg-success/10", text: "text-success" },
    PENDING: { bg: "bg-warning/10", text: "text-warning" },
    DECLINED: { bg: "bg-destructive/10", text: "text-destructive" },
    EXPIRED: { bg: "bg-muted", text: "text-muted-foreground" },
    UNLINKED: { bg: "bg-muted", text: "text-muted-foreground" },
  };

  const statusColor = statusColors[link.status];

  return (
    <li>
      <Link
        href={`/clients?selected=${link.id}`}
        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:bg-muted"
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-medium text-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{link.client.fullName}</p>
            {link.status === "ACTIVE" && (
              <Badge className={`flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}>
                Ativo
              </Badge>
            )}
            {link.status === "PENDING" && (
              <Badge className={`flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}>
                Pendente
              </Badge>
            )}
          </div>

          {/* Activity Signals Row */}
          {link.status === "ACTIVE" && (
            <div className="flex items-center gap-2 mt-1">
              {activitySignals?.hasContraindications && (
                <div className="flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>Contraindicação</span>
                </div>
              )}
              {activitySignals?.unreadMessageCount ? (
                <div className="flex items-center gap-1 text-xs text-accent">
                  <MessageCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{activitySignals.unreadMessageCount} mensagem{activitySignals.unreadMessageCount > 1 ? 's' : ''}</span>
                </div>
              ) : null}
              {activitySignals?.hasNoCheckInScheduled && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Sem check-in</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground truncate mt-1">
            {SPECIALIZATION_LABELS[link.specialization] ?? link.specialization}
          </p>

          {link.status === "ACTIVE" && activitySignals?.lastActivityAt && (
            <p className="text-xs text-muted-foreground">
              Última atividade: {formatDate(activitySignals.lastActivityAt)}
            </p>
          )}
        </div>

        {link.status === "ACTIVE" && (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              unlink();
            }}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive disabled:opacity-60"
            title="Encerrar vínculo"
          >
            ✕
          </button>
        )}
      </Link>
    </li>
  );
}
