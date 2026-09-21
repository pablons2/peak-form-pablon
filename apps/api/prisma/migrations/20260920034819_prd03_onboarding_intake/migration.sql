-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED_WITH_ACKNOWLEDGEMENT');

-- CreateEnum
CREATE TYPE "BodyRegion" AS ENUM ('NECK', 'SHOULDER_LEFT', 'SHOULDER_RIGHT', 'UPPER_BACK', 'LOWER_BACK', 'CHEST', 'ABDOMEN', 'HIP_LEFT', 'HIP_RIGHT', 'ELBOW_LEFT', 'ELBOW_RIGHT', 'WRIST_LEFT', 'WRIST_RIGHT', 'KNEE_LEFT', 'KNEE_RIGHT', 'ANKLE_LEFT', 'ANKLE_RIGHT');

-- CreateEnum
CREATE TYPE "MedicalCondition" AS ENUM ('DIABETES', 'CARDIOVASCULAR_DISEASE', 'HYPERTENSION', 'ASTHMA_OR_RESPIRATORY', 'PREGNANCY', 'OTHER');

-- CreateTable
CREATE TABLE "intake_assessments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "parqAnswers" JSONB,
    "painFlags" JSONB NOT NULL DEFAULT '[]',
    "medicalConditions" "MedicalCondition"[] DEFAULT ARRAY[]::"MedicalCondition"[],
    "medicalConditionsOtherNote" TEXT,
    "medications" TEXT,
    "availability" JSONB,
    "equipmentAccess" JSONB,
    "contraindicationTagCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_annotations" (
    "id" TEXT NOT NULL,
    "intakeAssessmentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intake_assessments_clientId_status_idx" ON "intake_assessments"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "intake_assessments_clientId_version_key" ON "intake_assessments"("clientId", "version");

-- CreateIndex
CREATE INDEX "professional_annotations_intakeAssessmentId_idx" ON "professional_annotations"("intakeAssessmentId");

-- AddForeignKey
ALTER TABLE "intake_assessments" ADD CONSTRAINT "intake_assessments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_annotations" ADD CONSTRAINT "professional_annotations_intakeAssessmentId_fkey" FOREIGN KEY ("intakeAssessmentId") REFERENCES "intake_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_annotations" ADD CONSTRAINT "professional_annotations_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
