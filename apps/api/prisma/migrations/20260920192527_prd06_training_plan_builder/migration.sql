-- CreateEnum
CREATE TYPE "TrainingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MesocycleGoal" AS ENUM ('HYPERTROPHY', 'STRENGTH', 'ENDURANCE', 'POWER', 'GENERAL_FITNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "professionalId" TEXT,
    "authoredById" TEXT,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "TrainingPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "isStarterTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesocycles" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weeks" INTEGER NOT NULL,
    "goal" "MesocycleGoal" NOT NULL,
    "isDeload" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesocycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_microcycle_templates" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_microcycle_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_microcycle_template_exercises" (
    "id" TEXT NOT NULL,
    "weeklyMicrocycleTemplateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetRepsMin" INTEGER NOT NULL,
    "targetRepsMax" INTEGER,
    "targetLoad" DOUBLE PRECISION,
    "targetPercent1RM" DOUBLE PRECISION,
    "targetRpe" DOUBLE PRECISION,
    "targetRir" DOUBLE PRECISION,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "weekly_microcycle_template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "originalDate" DATE,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "overriddenFromTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetRepsMin" INTEGER NOT NULL,
    "targetRepsMax" INTEGER,
    "targetLoad" DOUBLE PRECISION,
    "targetPercent1RM" DOUBLE PRECISION,
    "targetRpe" DOUBLE PRECISION,
    "targetRir" DOUBLE PRECISION,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_plans_clientId_idx" ON "training_plans"("clientId");

-- CreateIndex
CREATE INDEX "training_plans_professionalId_idx" ON "training_plans"("professionalId");

-- CreateIndex
CREATE INDEX "training_plans_isStarterTemplate_idx" ON "training_plans"("isStarterTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "mesocycles_trainingPlanId_order_key" ON "mesocycles"("trainingPlanId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_microcycle_templates_mesocycleId_weekday_key" ON "weekly_microcycle_templates"("mesocycleId", "weekday");

-- CreateIndex
CREATE INDEX "weekly_microcycle_template_exercises_weeklyMicrocycleTempla_idx" ON "weekly_microcycle_template_exercises"("weeklyMicrocycleTemplateId");

-- CreateIndex
CREATE INDEX "sessions_mesocycleId_status_idx" ON "sessions"("mesocycleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_mesocycleId_date_key" ON "sessions"("mesocycleId", "date");

-- CreateIndex
CREATE INDEX "session_exercises_sessionId_idx" ON "session_exercises"("sessionId");

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_authoredById_fkey" FOREIGN KEY ("authoredById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_microcycle_templates" ADD CONSTRAINT "weekly_microcycle_templates_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "mesocycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_microcycle_template_exercises" ADD CONSTRAINT "weekly_microcycle_template_exercises_weeklyMicrocycleTempl_fkey" FOREIGN KEY ("weeklyMicrocycleTemplateId") REFERENCES "weekly_microcycle_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_microcycle_template_exercises" ADD CONSTRAINT "weekly_microcycle_template_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "mesocycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
