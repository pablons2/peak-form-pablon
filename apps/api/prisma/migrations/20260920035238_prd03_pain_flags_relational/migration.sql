/*
  Warnings:

  - You are about to drop the column `painFlags` on the `intake_assessments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PainRecency" AS ENUM ('PAST', 'CURRENT');

-- AlterTable
ALTER TABLE "intake_assessments" DROP COLUMN "painFlags";

-- CreateTable
CREATE TABLE "pain_flags" (
    "id" TEXT NOT NULL,
    "intakeAssessmentId" TEXT NOT NULL,
    "region" "BodyRegion" NOT NULL,
    "severity" INTEGER NOT NULL,
    "pastOrCurrent" "PainRecency" NOT NULL,

    CONSTRAINT "pain_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pain_flags_intakeAssessmentId_idx" ON "pain_flags"("intakeAssessmentId");

-- AddForeignKey
ALTER TABLE "pain_flags" ADD CONSTRAINT "pain_flags_intakeAssessmentId_fkey" FOREIGN KEY ("intakeAssessmentId") REFERENCES "intake_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
