import type {
  LinkInvitedBy,
  LinkStatus,
  ProfessionalClientLink,
  Specialization,
  User,
} from "@prisma/client";

export const LINK_REPOSITORY = Symbol("LINK_REPOSITORY");

export type LinkWithParties = ProfessionalClientLink & {
  professional: User;
  client: User;
};

export interface CreateLinkInput {
  professionalId: string;
  clientId: string;
  specialization: Specialization;
  invitedBy: LinkInvitedBy;
  expiresAt: Date;
}

export interface LinkUpdateData {
  status?: LinkStatus;
  linkedAt?: Date | null;
  unlinkedAt?: Date | null;
  unlinkedById?: string | null;
  expiresAt?: Date | null;
}

/// Infrastructure implements this (base doc §7.2 DIP); Application use-cases
/// depend only on this interface. Deliberately CRUD-shaped — business rules
/// (the one-PT-one-Nutritionist constraint, expiry, unlink side-effects) live
/// in the use-cases, not here.
export interface LinkRepository {
  findById(id: string): Promise<LinkWithParties | null>;
  findLatestByKey(
    professionalId: string,
    clientId: string,
    specialization: Specialization,
  ): Promise<ProfessionalClientLink | null>;
  findActiveForClient(
    clientId: string,
    specialization: Specialization,
  ): Promise<ProfessionalClientLink | null>;

  create(input: CreateLinkInput): Promise<LinkWithParties>;
  update(id: string, data: LinkUpdateData): Promise<LinkWithParties>;

  listForProfessional(professionalId: string): Promise<LinkWithParties[]>;
  listForClient(clientId: string): Promise<LinkWithParties[]>;
  listAll(): Promise<LinkWithParties[]>;

  /// PRD 02 §5.1 — PENDING invites auto-expire; returns the number expired.
  expireStalePending(now: Date): Promise<number>;
}

export type { LinkInvitedBy, Specialization };
