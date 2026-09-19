import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import {
  ApprovalStatus,
  Role,
  UserStatus,
  type BiologicalSex,
  type Prisma,
  type Specialization,
} from "@prisma/client";
import { AppModule } from "../../src/app.module";
import { MAILER } from "../../src/auth/domain/ports/mailer.port";
import { GOOGLE_TOKEN_VERIFIER } from "../../src/auth/domain/ports/google-token-verifier.port";
import type { UserWithProfiles } from "../../src/auth/domain/ports/user.repository.port";
import { PrismaService } from "../../src/prisma/prisma.service";
import {
  FakeGoogleTokenVerifier,
  FakeMailer,
  ProfessionalOnlyProbeController,
} from "./fakes";

export const TEST_PASSWORD = "S3cure!Pass";

// Shared per-steps-file test harness: boots the real AppModule against the real
// test database, with only genuinely external services faked at the port
// boundary (PRD 15 §5.2) — SMTP → FakeMailer, Google's token endpoint →
// FakeGoogleTokenVerifier. The real ThrottlerGuard stays active; its hit-count
// storage is cleared between scenarios (see reset()) so accumulated requests
// from the single test IP can't trip the per-minute auth limits across
// scenarios — each scenario gets a fresh, realistic rate-limit budget.
export class AuthTestWorld {
  private constructor(
    public readonly app: INestApplication,
    public readonly prisma: PrismaService,
    public readonly mailer: FakeMailer,
    public readonly google: FakeGoogleTokenVerifier,
  ) {}

  static async boot(): Promise<AuthTestWorld> {
    const mailer = new FakeMailer();
    const google = new FakeGoogleTokenVerifier();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProfessionalOnlyProbeController],
    })
      .overrideProvider(MAILER)
      .useValue(mailer)
      .overrideProvider(GOOGLE_TOKEN_VERIFIER)
      .useValue(google)
      .compile();

    const app = moduleRef.createNestApplication();
    // main.ts applies cookie-parser in bootstrap(); a testing module never
    // runs bootstrap, so the refresh-token cookie needs it wired here too.
    app.use(cookieParser());
    await app.init();

    return new AuthTestWorld(app, app.get(PrismaService), mailer, google);
  }

  get http() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.app.getHttpServer();
  }

  async reset(): Promise<void> {
    this.mailer.sent.length = 0;
    // users CASCADE covers professional_profiles, client_profiles, audit_logs
    // (all FK into users).
    await this.prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    // Reset rate-limit hit counts so each scenario gets a fresh budget —
    // ThrottlerStorageService.storage is the in-memory Map keyed by
    // IP+throttler. (Internal API, but clearing it keeps the real guard
    // active rather than bypassing it.)
    const storage = this.app.get(ThrottlerStorage) as unknown as {
      storage: Map<string, unknown>;
    };
    storage.storage.clear();
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  // --- Direct-DB seeders (Given steps) — bypass HTTP so scenarios can start
  // from states the API alone can't reach in one call (e.g. already-verified,
  // already-deactivated, APPROVED, or ADMIN users). ---

  async seedLink(
    professional: UserWithProfiles,
    client: UserWithProfiles,
    opts: {
      specialization?: Specialization;
      status?: "PENDING" | "ACTIVE" | "DECLINED" | "EXPIRED" | "UNLINKED";
      invitedBy?: "PROFESSIONAL" | "CLIENT";
      linkedAt?: Date;
      expiresAt?: Date;
    } = {},
  ) {
    return this.prisma.professionalClientLink.create({
      data: {
        professionalId: professional.id,
        clientId: client.id,
        specialization: opts.specialization ?? "PERSONAL_TRAINER",
        status: opts.status ?? "PENDING",
        invitedBy: opts.invitedBy ?? "PROFESSIONAL",
        linkedAt: opts.linkedAt ?? null,
        expiresAt:
          opts.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { professional: true, client: true },
    });
  }

  async seedAdmin(email: string): Promise<UserWithProfiles> {
    return this.seedUser({ email, fullName: "Test Admin", role: Role.ADMIN });
  }

  async seedClient(
    email: string,
    opts: {
      fullName?: string;
      status?: UserStatus;
      verified?: boolean;
      password?: string | null;
      dateOfBirth?: Date;
      biologicalSex?: BiologicalSex;
    } = {},
  ): Promise<UserWithProfiles> {
    const user = await this.seedUser({
      email,
      fullName: opts.fullName ?? "Test Client",
      role: Role.CLIENT,
      status: opts.status,
      verified: opts.verified,
      password: opts.password,
    });
    await this.prisma.clientProfile.create({
      data: {
        userId: user.id,
        dateOfBirth: opts.dateOfBirth ?? new Date("1990-01-01"),
        biologicalSex: opts.biologicalSex ?? "FEMALE",
      },
    });
    return (await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { clientProfile: true, professionalProfile: true },
    })) as UserWithProfiles;
  }

  async seedProfessional(
    email: string,
    opts: {
      fullName?: string;
      status?: UserStatus;
      verified?: boolean;
      password?: string | null;
      approvalStatus?: ApprovalStatus;
      specializations?: Specialization[];
      verificationNote?: string;
    } = {},
  ): Promise<UserWithProfiles> {
    const user = await this.seedUser({
      email,
      fullName: opts.fullName ?? "Test Professional",
      role: Role.PROFESSIONAL,
      status: opts.status,
      verified: opts.verified,
      password: opts.password,
    });
    await this.prisma.professionalProfile.create({
      data: {
        userId: user.id,
        specializations: opts.specializations ?? ["PERSONAL_TRAINER"],
        approvalStatus: opts.approvalStatus ?? "PENDING_APPROVAL",
        verificationNote: opts.verificationNote ?? "CREF 12345-G/SP",
      },
    });
    return (await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { clientProfile: true, professionalProfile: true },
    })) as UserWithProfiles;
  }

  private async seedUser(input: {
    email: string;
    fullName: string;
    role: Role;
    status?: UserStatus;
    verified?: boolean;
    password?: string | null;
  }): Promise<UserWithProfiles> {
    const data: Prisma.UserCreateInput = {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      status: input.status ?? UserStatus.ACTIVE,
      // Low bcrypt cost factor keeps the suite fast; hash format/verification
      // is identical to production's cost-12 hash.
      passwordHash:
        input.password === null
          ? null
          : bcrypt.hashSync(input.password ?? TEST_PASSWORD, 4),
      emailVerifiedAt: (input.verified ?? true) ? new Date() : null,
    };
    return (await this.prisma.user.create({
      data,
      include: { clientProfile: true, professionalProfile: true },
    })) as UserWithProfiles;
  }
}
