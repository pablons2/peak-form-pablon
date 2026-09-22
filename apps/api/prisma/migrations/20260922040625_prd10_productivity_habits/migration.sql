-- CreateEnum
CREATE TYPE "HabitCadence" AS ENUM ('DAILY', 'SPECIFIC_WEEKDAYS');

-- CreateTable
CREATE TABLE "habit_definitions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" "HabitCadence" NOT NULL DEFAULT 'DAILY',
    "weekdays" "Weekday"[] DEFAULT ARRAY[]::"Weekday"[],
    "reminderTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "habit_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_check_ins" (
    "id" TEXT NOT NULL,
    "habitDefinitionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_tasks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dueDate" DATE,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "personal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_definitions_clientId_idx" ON "habit_definitions"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "habit_check_ins_habitDefinitionId_date_key" ON "habit_check_ins"("habitDefinitionId", "date");

-- CreateIndex
CREATE INDEX "personal_tasks_clientId_idx" ON "personal_tasks"("clientId");

-- AddForeignKey
ALTER TABLE "habit_definitions" ADD CONSTRAINT "habit_definitions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_check_ins" ADD CONSTRAINT "habit_check_ins_habitDefinitionId_fkey" FOREIGN KEY ("habitDefinitionId") REFERENCES "habit_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_tasks" ADD CONSTRAINT "personal_tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
