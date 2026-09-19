"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PublicLink } from "../api-client";
import { acceptLinkAction, declineLinkAction, unlinkAction } from "../actions";
import { LINK_STATUS_LABELS, SPECIALIZATION_LABELS, formatDate } from "../labels";

// PRD 02 §7 — one relationship row, shared by the Client's "My Team" screen
// and the Professional's client list. Renders the counterpart (whichever
// party isn't the viewer) and the action available to the viewer for that
// link's status: respond to a PENDING invite addressed to them, unlink an
// ACTIVE relationship, or just the status for anything else (history).
export function LinkCard({
  link,
  viewerId,
  detailHref,
}: {
  link: PublicLink;
  viewerId: string;
  detailHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const isProfessionalViewer = viewerId === link.professional.id;
  const counterpart = isProfessionalViewer ? link.client : link.professional;
  const isRecipient =
    (link.invitedBy === "PROFESSIONAL" && !isProfessionalViewer) ||
    (link.invitedBy === "CLIENT" && isProfessionalViewer);

  function accept() {
    setError(undefined);
    startTransition(async () => {
      const result = await acceptLinkAction(link.id);
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  function decline() {
    setError(undefined);
    startTransition(async () => {
      const result = await declineLinkAction(link.id);
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  function unlink() {
    setError(undefined);
    startTransition(async () => {
      const result = await unlinkAction(link.id);
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{counterpart.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {SPECIALIZATION_LABELS[link.specialization] ?? link.specialization}
            {" · "}
            {LINK_STATUS_LABELS[link.status] ?? link.status}
          </p>
          {link.status === "ACTIVE" && link.linkedAt ? (
            <p className="text-xs text-muted-foreground">
              Vinculado desde {formatDate(link.linkedAt)}
            </p>
          ) : null}
        </div>
        {detailHref && link.status === "ACTIVE" ? (
          <Link
            href={detailHref}
            className="text-sm text-accent hover:underline"
          >
            Ver detalhes
          </Link>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        {link.status === "PENDING" && isRecipient ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={accept}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Aceitar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={decline}
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              Recusar
            </button>
          </>
        ) : null}
        {link.status === "PENDING" && !isRecipient ? (
          <p className="text-sm text-muted-foreground">Aguardando resposta</p>
        ) : null}
        {link.status === "ACTIVE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={unlink}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            Encerrar vínculo
          </button>
        ) : null}
      </div>
    </li>
  );
}
