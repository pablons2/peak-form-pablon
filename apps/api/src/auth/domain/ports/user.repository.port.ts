import type {
  ApprovalStatus,
  BiologicalSex,
  ClientProfile,
  ProfessionalProfile,
  Role,
  Specialization,
  User,
  UserStatus,
} from "@prisma/client";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export type UserWithProfiles = User & {
  clientProfile: ClientProfile | null;
  professionalProfile: ProfessionalProfile | null;
};

export interface CreateClientInput {
  email: string;
  fullName: string;
  passwordHash: string | null;
  oauthProviders: string[];
  emailVerifiedAt: Date | null;
  dateOfBirth: Date;
  biologicalSex: BiologicalSex;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
}

export interface CreateProfessionalInput {
  email: string;
  fullName: string;
  passwordHash: string | null;
  oauthProviders: string[];
  emailVerifiedAt: Date | null;
  specializations: Specialization[];
  verificationNote: string;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
}

export interface UserUpdateData {
  fullName?: string;
  passwordHash?: string;
  oauthProviders?: string[];
  status?: UserStatus;
  emailVerifiedAt?: Date | null;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  tokenVersion?: { increment: number };
}

export interface ProfessionalProfileUpdateData {
  approvalStatus?: ApprovalStatus;
  approvedById?: string | null;
  approvedAt?: Date | null;
}

/// Infrastructure implements this (base doc §7.2 Dependency Inversion);
/// Application use-cases depend only on this interface. Deliberately
/// CRUD-shaped — business rules (token expiry checks, approval-decision
/// logic) live in the use-cases, not here.
export interface UserRepository {
  findByEmail(email: string): Promise<UserWithProfiles | null>;
  findById(id: string): Promise<UserWithProfiles | null>;
  findByEmailVerificationTokenHash(
    hash: string,
  ): Promise<UserWithProfiles | null>;
  findByPasswordResetTokenHash(hash: string): Promise<UserWithProfiles | null>;

  createClient(input: CreateClientInput): Promise<UserWithProfiles>;
  createProfessional(input: CreateProfessionalInput): Promise<UserWithProfiles>;

  update(id: string, data: UserUpdateData): Promise<UserWithProfiles>;

  listPendingProfessionals(): Promise<
    (ProfessionalProfile & { user: User })[]
  >;
  updateProfessionalProfile(
    userId: string,
    data: ProfessionalProfileUpdateData,
  ): Promise<ProfessionalProfile>;
}

export type { Role };
