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
  // One hash shared by all four accounts — the password is the same anyway
  // and four rounds-12 bcrypt hashes would make `make up` noticeably slower.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const verifiedAt = new Date();

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

  const client = await prisma.user.upsert({
    where: { email: "client@peakform.demo" },
    update: { passwordHash, emailVerifiedAt: verifiedAt },
    create: {
      email: "client@peakform.demo",
      fullName: "Demo Client",
      passwordHash,
      role: "CLIENT",
      emailVerifiedAt: verifiedAt,
    },
  });
  // dateOfBirth/biologicalSex are required (they feed PRD 04/08's formulas).
  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    update: {},
    create: {
      userId: client.id,
      dateOfBirth: new Date("1995-06-15"),
      biologicalSex: "FEMALE",
    },
  });

  console.log("Seed complete — demo credentials (password: Demo12345!):");
  console.log("  Admin:            admin@peakform.demo");
  console.log("  Personal Trainer: trainer@peakform.demo");
  console.log("  Nutritionist:     nutritionist@peakform.demo");
  console.log("  Client:           client@peakform.demo");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
