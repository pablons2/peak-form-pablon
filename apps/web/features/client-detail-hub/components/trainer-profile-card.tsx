"use client";

import { Badge } from "@peakform/ui";
import type { PublicLink } from "@/features/relationships/api-client";

export function TrainerProfileCard({
  link,
}: {
  link: PublicLink;
}) {
  const initials = link.professional.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const specializationLabel =
    link.specialization === "PERSONAL_TRAINER" ? "Personal Trainer" : "Nutricionista";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-3 items-start">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Responsável</p>
          <p className="mt-1 font-semibold text-foreground">{link.professional.fullName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{link.professional.email}</p>

          <div className="mt-2 flex gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary text-xs">
              {specializationLabel}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
