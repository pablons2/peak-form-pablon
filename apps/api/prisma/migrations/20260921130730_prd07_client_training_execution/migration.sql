-- CreateTable
CREATE TABLE "exercise_logs" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "actualReps" INTEGER NOT NULL,
    "actualLoad" DOUBLE PRECISION,
    "actualRpeOrRir" DOUBLE PRECISION,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_logs_sessionExerciseId_idx" ON "exercise_logs"("sessionExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_logs_sessionExerciseId_setNumber_key" ON "exercise_logs"("sessionExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "session_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
