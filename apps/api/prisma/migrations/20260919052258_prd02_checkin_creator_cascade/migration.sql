-- DropForeignKey
ALTER TABLE "check_in_schedules" DROP CONSTRAINT "check_in_schedules_createdById_fkey";

-- AddForeignKey
ALTER TABLE "check_in_schedules" ADD CONSTRAINT "check_in_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
