import { LinkStatus, Specialization } from "@prisma/client";

// Human-facing labels for enum values used across emails and API errors
// (PRD 02 §5/§7). Kept in the Domain layer so every use-case words these
// the same way.
export function specializationLabel(s: Specialization): string {
  return s === Specialization.PERSONAL_TRAINER
    ? "personal trainer"
    : "nutritionist";
}

export function linkStatusLabel(s: LinkStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
