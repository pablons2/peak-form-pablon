import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateClientInput,
  CreateProfessionalInput,
  ProfessionalProfileUpdateData,
  UserListFilters,
  UserRepository,
  UserUpdateData,
  UserWithProfiles,
} from "../domain/ports/user.repository.port";

const WITH_PROFILES = {
  clientProfile: true,
  professionalProfile: true,
} as const;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: WITH_PROFILES,
    });
  }

  findById(id: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: WITH_PROFILES,
    });
  }

  findByEmailVerificationTokenHash(
    hash: string,
  ): Promise<UserWithProfiles | null> {
    return this.prisma.user.findFirst({
      where: { emailVerificationTokenHash: hash },
      include: WITH_PROFILES,
    });
  }

  findByPasswordResetTokenHash(hash: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findFirst({
      where: { passwordResetTokenHash: hash },
      include: WITH_PROFILES,
    });
  }

  createClient(input: CreateClientInput): Promise<UserWithProfiles> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        oauthProviders: input.oauthProviders,
        role: Role.CLIENT,
        emailVerifiedAt: input.emailVerifiedAt,
        emailVerificationTokenHash: input.emailVerificationTokenHash,
        emailVerificationExpiresAt: input.emailVerificationExpiresAt,
        clientProfile: {
          create: {
            dateOfBirth: input.dateOfBirth,
            biologicalSex: input.biologicalSex,
          },
        },
      },
      include: WITH_PROFILES,
    });
  }

  createProfessional(input: CreateProfessionalInput): Promise<UserWithProfiles> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        oauthProviders: input.oauthProviders,
        role: Role.PROFESSIONAL,
        emailVerifiedAt: input.emailVerifiedAt,
        emailVerificationTokenHash: input.emailVerificationTokenHash,
        emailVerificationExpiresAt: input.emailVerificationExpiresAt,
        professionalProfile: {
          create: {
            specializations: input.specializations,
            verificationNote: input.verificationNote,
          },
        },
      },
      include: WITH_PROFILES,
    });
  }

  update(id: string, data: UserUpdateData): Promise<UserWithProfiles> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: WITH_PROFILES,
    });
  }

  listPendingProfessionals() {
    return this.prisma.professionalProfile.findMany({
      where: { approvalStatus: "PENDING_APPROVAL" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  }

  updateProfessionalProfile(
    userId: string,
    data: ProfessionalProfileUpdateData,
  ) {
    return this.prisma.professionalProfile.update({
      where: { userId },
      data,
    });
  }

  listAll(filters: UserListFilters): Promise<UserWithProfiles[]> {
    return this.prisma.user.findMany({
      where: {
        role: filters.role,
        status: filters.status,
        ...(filters.q
          ? {
              OR: [
                { email: { contains: filters.q, mode: "insensitive" } },
                { fullName: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: WITH_PROFILES,
      orderBy: { createdAt: "desc" },
    });
  }
}
