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
import { MEDIA_STORE } from "../../src/exercises/domain/ports/media-store.port";
import { SIGNED_MEDIA_STORE } from "../../src/body-assessments/domain/ports/signed-media-store.port";
import {
  OPEN_FOOD_FACTS_CLIENT,
  USDA_FOOD_DATA_CLIENT,
} from "../../src/nutrition/domain/ports/food-lookup.port";
import type { UserWithProfiles } from "../../src/auth/domain/ports/user.repository.port";
import { PrismaService } from "../../src/prisma/prisma.service";
import {
  FakeGoogleTokenVerifier,
  FakeMailer,
  FakeMediaStore,
  FakeOpenFoodFactsClient,
  FakeSignedMediaStore,
  FakeUsdaFoodDataClient,
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
    public readonly mediaStore: FakeMediaStore,
    public readonly signedMediaStore: FakeSignedMediaStore,
    public readonly openFoodFacts: FakeOpenFoodFactsClient,
    public readonly usda: FakeUsdaFoodDataClient,
  ) {}

  static async boot(): Promise<AuthTestWorld> {
    const mailer = new FakeMailer();
    const google = new FakeGoogleTokenVerifier();
    const mediaStore = new FakeMediaStore();
    const signedMediaStore = new FakeSignedMediaStore();
    const openFoodFacts = new FakeOpenFoodFactsClient();
    const usda = new FakeUsdaFoodDataClient();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProfessionalOnlyProbeController],
    })
      .overrideProvider(MAILER)
      .useValue(mailer)
      .overrideProvider(GOOGLE_TOKEN_VERIFIER)
      .useValue(google)
      .overrideProvider(MEDIA_STORE)
      .useValue(mediaStore)
      .overrideProvider(SIGNED_MEDIA_STORE)
      .useValue(signedMediaStore)
      .overrideProvider(OPEN_FOOD_FACTS_CLIENT)
      .useValue(openFoodFacts)
      .overrideProvider(USDA_FOOD_DATA_CLIENT)
      .useValue(usda)
      .compile();

    const app = moduleRef.createNestApplication();
    // main.ts applies cookie-parser in bootstrap(); a testing module never
    // runs bootstrap, so the refresh-token cookie needs it wired here too.
    app.use(cookieParser());
    await app.init();

    return new AuthTestWorld(
      app,
      app.get(PrismaService),
      mailer,
      google,
      mediaStore,
      signedMediaStore,
      openFoodFacts,
      usda,
    );
  }

  get http() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.app.getHttpServer();
  }

  async reset(): Promise<void> {
    this.mailer.sent.length = 0;
    this.mediaStore.puts.length = 0;
    this.signedMediaStore.uploadRequests.length = 0;
    this.signedMediaStore.downloadRequests.length = 0;
    // users CASCADE covers professional_profiles, client_profiles, audit_logs,
    // nutrition_plans, food_diary_entries, hydration_logs (all FK into
    // users). exercises CASCADE covers its tag join table and is also
    // reachable via ownerProfessionalId → users. contraindication_tags is
    // intentionally NOT truncated — it's migration-seeded reference data
    // (PRD 05 §6), constant across scenarios like an enum table.
    // food_item_cache has no FK into users (PRD 08 §6 — it's normalized,
    // source-agnostic reference data), so it's truncated explicitly rather
    // than relying on the users cascade to reach it — otherwise a barcode
    // seeded via FakeOpenFoodFactsClient in one scenario would silently
    // satisfy a cache lookup in a later, unrelated scenario.
    await this.prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    await this.prisma.$executeRawUnsafe('TRUNCATE TABLE "exercises" CASCADE');
    await this.prisma.$executeRawUnsafe('TRUNCATE TABLE "food_item_cache" CASCADE');
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

  // PRD 04 §5.2/§10 — a Client whose ClientProfile row doesn't exist at all
  // (the only way dateOfBirth/biologicalSex can actually be "missing" in
  // this schema — both are required-not-null once the row exists, PRD 01
  // §6). Real signup always creates one; this seeder reaches the otherwise
  // unreachable-via-HTTP state directly, the same way seedAdmin bypasses
  // the (deliberately nonexistent) admin-signup endpoint.
  async seedClientMissingProfile(email: string): Promise<UserWithProfiles> {
    return this.seedUser({ email, fullName: "Profile-less Client", role: Role.CLIENT });
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

  // PRD 11 — direct-DB seeder for scenarios where an existing thread is a
  // precondition, not the thing under test (mirrors seedLink's role for PRD
  // 02 — the real accept/unlink HTTP flow is exercised separately, in the
  // scenarios that specifically prove the LINK_STATUS_CHANGED-driven
  // auto-creation/read-only transition).
  async seedMessageThread(
    professional: UserWithProfiles,
    client: UserWithProfiles,
    opts: { status?: "ACTIVE" | "READ_ONLY" } = {},
  ) {
    return this.prisma.messageThread.create({
      data: {
        professionalId: professional.id,
        clientId: client.id,
        status: opts.status ?? "ACTIVE",
      },
    });
  }

  async seedMessage(
    threadId: string,
    senderId: string,
    body: string,
    opts: { readAt?: Date } = {},
  ) {
    return this.prisma.message.create({
      data: { threadId, senderId, body, readAt: opts.readAt ?? null },
    });
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
