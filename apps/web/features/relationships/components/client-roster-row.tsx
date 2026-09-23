"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@peakform/ui";
import type { PublicLink } from "../api-client";
import { unlinkAction } from "../actions";
import { SPECIALIZATION_LABELS, formatDate } from "../labels";

export function ClientRosterRow({
  link,
  viewerId,
  isSelected = false,
}: {
  link: PublicLink;
  viewerId: string;
  isSelected?: boolean;
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

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "bg-success/10", text: "text-success" },
    PENDING: { bg: "bg-warning/10", text: "text-warning" },
    DECLINED: { bg: "bg-destructive/10", text: "text-destructive" },
  };

  const statusColor = statusColors[link.status] || statusColors.PENDING;

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
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {SPECIALIZATION_LABELS[link.specialization] ?? link.specialization}
          </p>
          {link.status === "ACTIVE" && link.linkedAt && (
            <p className="text-xs text-muted-foreground">
              Desde {formatDate(link.linkedAt)}
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
