-- CreateEnum
CREATE TYPE "BodyAssessmentSource" AS ENUM ('SELF_REPORTED', 'PROFESSIONAL_VALIDATED');

-- CreateEnum
CREATE TYPE "BodyFatSource" AS ENUM ('COMPUTED_POLLOCK7', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "BodyAssessmentGoalType" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'RECOMPOSITION', 'PERFORMANCE', 'REHABILITATION', 'OTHER');

-- CreateTable
CREATE TABLE "body_assessments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" "BodyAssessmentSource" NOT NULL,
    "validatedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "protocolVersion" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "circumferences" JSONB,
    "waistHipRatio" DOUBLE PRECISION,
    "skinfolds" JSONB,
    "bodyFatPercent" DOUBLE PRECISION,
    "bodyFatSource" "BodyFatSource",
    "bodyFatOverrideNote" TEXT,
    "postureScreening" JSONB,
    "photos" JSONB,
    "goalType" "BodyAssessmentGoalType",
    "goalTargetValue" DOUBLE PRECISION,
    "goalTargetDate" DATE,
    "goalNote" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_assessments_clientId_recordedAt_idx" ON "body_assessments"("clientId", "recordedAt");

-- AddForeignKey
ALTER TABLE "body_assessments" ADD CONSTRAINT "body_assessments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_assessments" ADD CONSTRAINT "body_assessments_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
