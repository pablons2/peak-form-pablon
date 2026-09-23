import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// PRD 14 §5.6 — seed data entry point. Creates one usable demo account per
// persona (Admin, Personal Trainer, Nutritionist, Client) so a fresh
// `make up` produces an explorable app rather than an empty database.
// Idempotent — everything is an upsert keyed on email, so `make seed` can
// re-run safely; emails use a `.demo` TLD so they're never mistaken for
// real user data or colliding with real signups.
//
// Direct Prisma writes rather than the signup endpoints: Admin has no
// signup route by design (PRD 01 §4), and credential signups would need a
// MailHog round-trip for email verification before they could log in.
//
//   dev:      npm run seed          (inside the api container — `make seed`)
//   prod:     node dist/seed.js     (after nest build)

const prisma = new PrismaClient();

// Satisfies signupClientSchema's password rules (≥10 chars, upper/lower/
// digit) even though the seed bypasses the API — keeps the demo password
// consistent with what the UI would accept if the user later resets it.
const DEMO_PASSWORD = "Demo12345!";
const SALT_ROUNDS = 12;

async function main() {
  // One hash shared by all accounts — the password is the same anyway
  // and multiple rounds-12 bcrypt hashes would make `make up` noticeably slower.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const verifiedAt = new Date();
  const now = new Date();

  const admin = await prisma.user.upsert({
    where: { email: "admin@peakform.demo" },
    update: { passwordHash, emailVerifiedAt: verifiedAt },
    create: {
      email: "admin@peakform.demo",
      fullName: "Demo Admin",
      passwordHash,
      role: "ADMIN",
      emailVerifiedAt: verifiedAt,
    },
  });

  // Professional accounts are unusable until Admin-approved (PRD 01 §5.6),
  // so the seed writes the APPROVED profile directly with the demo Admin as
  // the approval actor.
  const professionals: Array<{
    email: string;
    fullName: string;
    specializations: Array<"PERSONAL_TRAINER" | "NUTRITIONIST">;
    verificationNote: string;
  }> = [
    {
      email: "trainer@peakform.demo",
      fullName: "Demo Trainer",
      specializations: ["PERSONAL_TRAINER"],
      verificationNote: "Demo seed — CREF 00000-G/SP",
    },
    {
      email: "nutritionist@peakform.demo",
      fullName: "Demo Nutritionist",
      specializations: ["NUTRITIONIST"],
      verificationNote: "Demo seed — CRN 00000",
    },
  ];

  const profUsers: Record<string, { id: string }> = {};

  for (const pro of professionals) {
    const user = await prisma.user.upsert({
      where: { email: pro.email },
      update: { passwordHash, emailVerifiedAt: verifiedAt },
      create: {
        email: pro.email,
        fullName: pro.fullName,
        passwordHash,
        role: "PROFESSIONAL",
        emailVerifiedAt: verifiedAt,
      },
    });
    profUsers[pro.email] = user;

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      update: {
        specializations: pro.specializations,
        approvalStatus: "APPROVED",
        approvedById: admin.id,
        approvedAt: verifiedAt,
      },
      create: {
        userId: user.id,
        specializations: pro.specializations,
        approvalStatus: "APPROVED",
        verificationNote: pro.verificationNote,
        approvedById: admin.id,
        approvedAt: verifiedAt,
      },
    });
  }

  // Create 3 demo clients with profile data
  const clientsData = [
    {
      email: "client@peakform.demo",
      fullName: "Demo Client",
      dateOfBirth: new Date("1995-06-15"),
      biologicalSex: "FEMALE" as const,
    },
    {
      email: "client2@peakform.demo",
      fullName: "Ana Silva",
      dateOfBirth: new Date("1988-03-22"),
      biologicalSex: "FEMALE" as const,
    },
    {
      email: "client3@peakform.demo",
      fullName: "Carlos Santos",
      dateOfBirth: new Date("1992-11-08"),
      biologicalSex: "MALE" as const,
    },
  ];

  const clients: Record<string, { id: string }> = {};

  for (const clientData of clientsData) {
    const user = await prisma.user.upsert({
      where: { email: clientData.email },
      update: { passwordHash, emailVerifiedAt: verifiedAt },
      create: {
        email: clientData.email,
        fullName: clientData.fullName,
        passwordHash,
        role: "CLIENT",
        emailVerifiedAt: verifiedAt,
      },
    });
    clients[clientData.email] = user;

    // dateOfBirth/biologicalSex are required (they feed PRD 04/08's formulas).
    await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        dateOfBirth: clientData.dateOfBirth,
        biologicalSex: clientData.biologicalSex,
      },
    });
  }

  const trainer = profUsers["trainer@peakform.demo"];
  const nutritionist = profUsers["nutritionist@peakform.demo"];
  const client1 = clients["client@peakform.demo"];
  const client2 = clients["client2@peakform.demo"];
  const client3 = clients["client3@peakform.demo"];

  // Create links:
  // Trainer ↔ Client 1 & 2
  // Nutritionist ↔ Client 2 & 3
  const links = [
    {
      professionalId: trainer.id,
      clientId: client1.id,
      specialization: "PERSONAL_TRAINER" as const,
      invitedBy: "PROFESSIONAL" as const,
      status: "ACTIVE" as const,
    },
    {
      professionalId: trainer.id,
      clientId: client2.id,
      specialization: "PERSONAL_TRAINER" as const,
      invitedBy: "PROFESSIONAL" as const,
      status: "ACTIVE" as const,
    },
    {
      professionalId: nutritionist.id,
      clientId: client2.id,
      specialization: "NUTRITIONIST" as const,
      invitedBy: "PROFESSIONAL" as const,
      status: "ACTIVE" as const,
    },
    {
      professionalId: nutritionist.id,
      clientId: client3.id,
      specialization: "NUTRITIONIST" as const,
      invitedBy: "PROFESSIONAL" as const,
      status: "ACTIVE" as const,
    },
  ];

  for (const linkData of links) {
    await prisma.professionalClientLink.upsert({
      where: {
        professionalId_clientId: {
          professionalId: linkData.professionalId,
          clientId: linkData.clientId,
        },
      },
      update: {
        status: linkData.status,
        linkedAt: now,
      },
      create: {
        ...linkData,
        linkedAt: now,
      },
    });
  }

  // Create sample Training Plan for Client 1 (Trainer)
  await prisma.trainingPlan.upsert({
    where: {
      id: "demo-plan-client1",
    },
    update: {},
    create: {
      id: "demo-plan-client1",
      clientId: client1.id,
      professionalId: trainer.id,
      authoredById: trainer.id,
      name: "Plano de Treino — Demo",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      status: "ACTIVE",
    },
  });

  // Create sample Nutrition Plan for Client 2 (Nutritionist)
  await prisma.nutritionPlan.upsert({
    where: {
      id: "demo-plan-client2",
    },
    update: {},
    create: {
      id: "demo-plan-client2",
      clientId: client2.id,
      nutritionistId: nutritionist.id,
      calorieTarget: 2000,
      macroTargets: {
        protein: 150,
        carbs: 200,
        fat: 65,
      },
      status: "ACTIVE",
    },
  });

  console.log("");
  console.log("✅ Seed complete — demo credentials (password: Demo12345!):");
  console.log("");
  console.log("Admin:");
  console.log("  admin@peakform.demo");
  console.log("");
  console.log("Professionals:");
  console.log("  trainer@peakform.demo         (Personal Trainer)");
  console.log("  nutritionist@peakform.demo    (Nutritionist)");
  console.log("");
  console.log("Clients:");
  console.log("  client@peakform.demo          (linked to Trainer)");
  console.log("  client2@peakform.demo (Ana)   (linked to Trainer + Nutritionist)");
  console.log("  client3@peakform.demo (Carlos) (linked to Nutritionist)");
  console.log("");
  console.log("Sample Data:");
  console.log("  • Training Plan for Client 1 (Trainer)");
  console.log("  • Nutrition Plan for Client 2 (Nutritionist)");
  console.log("");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
