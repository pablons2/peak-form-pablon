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
import { MAILER } from "../../src/notifications/domain/ports/mailer.port";
import { GOOGLE_TOKEN_VERIFIER } from "../../src/auth/domain/ports/google-token-verifier.port";
import { MEDIA_STORE } from "../../src/exercises/domain/ports/media-store.port";
import { SIGNED_MEDIA_STORE } from "../../src/body-assessments/domain/ports/signed-media-store.port";
import {
  OPEN_FOOD_FACTS_CLIENT,
  TACO_FOOD_CLIENT,
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
  FakeTacoApiClient,
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
    public readonly taco: FakeTacoApiClient,
  ) {}

  static async boot(): Promise<AuthTestWorld> {
    const mailer = new FakeMailer();
    const google = new FakeGoogleTokenVerifier();
    const mediaStore = new FakeMediaStore();
    const signedMediaStore = new FakeSignedMediaStore();
    const openFoodFacts = new FakeOpenFoodFactsClient();
    const usda = new FakeUsdaFoodDataClient();
    const taco = new FakeTacoApiClient();
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
      .overrideProvider(TACO_FOOD_CLIENT)
      .useValue(taco)
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
      taco,
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
    // nutrition_plans, food_diary_entries, hydration_logs, habit_definitions,
    // personal_tasks (all FK into users) — habit_check_ins is reachable
    // transitively via habit_definitions' own onDelete: Cascade FK, so no
    // separate TRUNCATE is needed for any of PRD 10's three tables. exercises
    // CASCADE covers its tag join table and is also reachable via
    // ownerProfessionalId → users. contraindication_tags is
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

  // PRD 10 — direct-DB seeders mirroring seedMessageThread/seedMessage's
  // role: scenarios where an existing habit/check-in/task is a
  // precondition, not the thing under test (the real create/check-in HTTP
  // flows are exercised separately).
  async seedHabit(
    clientId: string,
    opts: {
      name?: string;
      cadence?: "DAILY" | "SPECIFIC_WEEKDAYS";
      weekdays?: Array<
        "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"
      >;
      archivedAt?: Date | null;
      createdAt?: Date;
    } = {},
  ) {
    return this.prisma.habitDefinition.create({
      data: {
        clientId,
        name: opts.name ?? "Beber agua",
        cadence: opts.cadence ?? "DAILY",
        weekdays: opts.weekdays ?? [],
        archivedAt: opts.archivedAt ?? null,
        createdAt: opts.createdAt ?? new Date("2024-01-01T00:00:00.000Z"),
      },
    });
  }

  async seedHabitCheckIn(habitId: string, date: string) {
    return this.prisma.habitCheckIn.create({
      data: { habitDefinitionId: habitId, date: new Date(`${date}T00:00:00.000Z`) },
    });
  }

  async seedTask(
    clientId: string,
    opts: { text?: string; dueDate?: string | null; done?: boolean } = {},
  ) {
    return this.prisma.personalTask.create({
      data: {
        clientId,
        text: opts.text ?? "Comprar suplemento",
        dueDate: opts.dueDate ? new Date(`${opts.dueDate}T00:00:00.000Z`) : null,
        done: opts.done ?? false,
        completedAt: opts.done ? new Date() : null,
      },
    });
  }

  // PRD 09 — direct-DB seeders mirroring seedHabit/seedMessageThread's role:
  // a Session/BodyAssessment/CheckInSchedule is a precondition for the
  // dashboard's aggregation, not the thing under test (PRD 06/07/04/02's own
  // suites already exercise the real create/generate/log/complete HTTP
  // flows end to end). seedTrainingSession creates a throwaway
  // TrainingPlan+Mesocycle to hang the Session off, since PRD 09's
  // scenarios only ever care about the Session's own date/status/logs.
  async seedExercise(opts: { name?: string } = {}) {
    return this.prisma.exercise.create({
      data: {
        name: opts.name ?? "Agachamento livre",
        muscleGroups: ["QUADRICEPS"],
        equipment: ["BARBELL"],
        difficulty: "BEGINNER",
        cues: ["Desça controlado"],
        mistakes: ["Perder a lordose lombar"],
        visibility: "GLOBAL",
      },
    });
  }

  async seedTrainingSession(
    client: UserWithProfiles,
    professional: UserWithProfiles,
    opts: {
      date: string;
      status?: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
      exerciseId?: string;
      loggedSets?: Array<{ actualReps: number; actualLoad: number | null }>;
    },
  ) {
    const exerciseId = opts.exerciseId ?? (await this.seedExercise()).id;
    const plan = await this.prisma.trainingPlan.create({
      data: {
        clientId: client.id,
        professionalId: professional.id,
        name: "Plano de teste",
        startDate: new Date(`${opts.date}T00:00:00.000Z`),
        status: "ACTIVE",
      },
    });
    const mesocycle = await this.prisma.mesocycle.create({
      data: { trainingPlanId: plan.id, order: 1, weeks: 1, goal: "GENERAL_FITNESS" },
    });
    const session = await this.prisma.session.create({
      data: {
        mesocycleId: mesocycle.id,
        date: new Date(`${opts.date}T00:00:00.000Z`),
        status: opts.status ?? "SCHEDULED",
        sessionExercises: {
          create: [{ exerciseId, order: 1, targetSets: 3, targetRepsMin: 8 }],
        },
      },
      include: { sessionExercises: true },
    });
    for (const [i, log] of (opts.loggedSets ?? []).entries()) {
      await this.prisma.exerciseLog.create({
        data: {
          sessionExerciseId: session.sessionExercises[0]!.id,
          setNumber: i + 1,
          actualReps: log.actualReps,
          actualLoad: log.actualLoad,
        },
      });
    }
    return session;
  }

  async seedBodyAssessment(
    clientId: string,
    opts: { weight: number; recordedAt: string },
  ) {
    return this.prisma.bodyAssessment.create({
      data: {
        clientId,
        source: "SELF_REPORTED",
        weight: opts.weight,
        recordedAt: new Date(`${opts.recordedAt}T00:00:00.000Z`),
      },
    });
  }

  // PRD 12 — an ACTIVE NutritionPlan is a precondition for the
  // missed-food-log job (and a confirmed plan's PLAN_UPDATED trigger is
  // exercised via the real HTTP confirm flow elsewhere); PRD 08's own
  // suite already covers draft→confirm end to end.
  async seedActiveNutritionPlan(clientId: string, nutritionistId: string) {
    return this.prisma.nutritionPlan.create({
      data: {
        clientId,
        nutritionistId,
        calorieTarget: 2200,
        macroTargets: { protein: 160, carbs: 220, fat: 70 },
        status: "ACTIVE",
        confirmedByProfessionalAt: new Date(),
      },
    });
  }

  async seedCheckInSchedule(
    link: { id: string },
    createdById: string,
    opts: { nextDueAt: string; status?: "ACTIVE" | "FIRED" | "CANCELLED" },
  ) {
    return this.prisma.checkInSchedule.create({
      data: {
        linkId: link.id,
        type: "ONE_OFF",
        dueDate: new Date(`${opts.nextDueAt}T00:00:00.000Z`),
        nextDueAt: new Date(`${opts.nextDueAt}T00:00:00.000Z`),
        status: opts.status ?? "ACTIVE",
        createdById,
      },
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
