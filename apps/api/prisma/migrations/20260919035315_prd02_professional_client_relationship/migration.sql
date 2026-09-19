-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'EXPIRED', 'UNLINKED');

-- CreateEnum
CREATE TYPE "LinkInvitedBy" AS ENUM ('PROFESSIONAL', 'CLIENT');

-- CreateEnum
CREATE TYPE "CheckInScheduleType" AS ENUM ('ONE_OFF', 'RECURRING');

-- CreateEnum
CREATE TYPE "CheckInCadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CheckInScheduleStatus" AS ENUM ('ACTIVE', 'FIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "professional_client_links" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "specialization" "Specialization" NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" "LinkInvitedBy" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "unlinkedAt" TIMESTAMP(3),
    "unlinkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_client_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_schedules" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "type" "CheckInScheduleType" NOT NULL,
    "cadence" "CheckInCadence",
    "anchor" INTEGER,
    "dueDate" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "note" TEXT,
    "status" "CheckInScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_client_links_clientId_specialization_status_idx" ON "professional_client_links"("clientId", "specialization", "status");

-- CreateIndex
CREATE INDEX "professional_client_links_professionalId_status_idx" ON "professional_client_links"("professionalId", "status");

-- CreateIndex
CREATE INDEX "check_in_schedules_status_nextDueAt_idx" ON "check_in_schedules"("status", "nextDueAt");

-- CreateIndex
CREATE INDEX "check_in_schedules_linkId_status_idx" ON "check_in_schedules"("linkId", "status");

-- AddForeignKey
ALTER TABLE "professional_client_links" ADD CONSTRAINT "professional_client_links_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_client_links" ADD CONSTRAINT "professional_client_links_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_client_links" ADD CONSTRAINT "professional_client_links_unlinkedById_fkey" FOREIGN KEY ("unlinkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_schedules" ADD CONSTRAINT "check_in_schedules_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "professional_client_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_schedules" ADD CONSTRAINT "check_in_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
