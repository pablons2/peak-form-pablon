-- CreateEnum
CREATE TYPE "ExerciseVisibility" AS ENUM ('GLOBAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'CORE', 'GLUTES', 'QUADRICEPS', 'HAMSTRINGS', 'CALVES', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'KETTLEBELL', 'RESISTANCE_BAND', 'CABLE', 'MACHINE', 'MEDICINE_BALL', 'BENCH', 'PULL_UP_BAR', 'STABILITY_BALL', 'FOAM_ROLLER');

-- CreateTable
CREATE TABLE "contraindication_tags" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "contraindication_tags_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "muscleGroups" "MuscleGroup"[],
    "equipment" "Equipment"[],
    "difficulty" "Difficulty" NOT NULL,
    "cues" TEXT[],
    "mistakes" TEXT[],
    "sourceApiId" TEXT,
    "sourceHash" TEXT,
    "ownerProfessionalId" TEXT,
    "visibility" "ExerciseVisibility" NOT NULL DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContraindicationTagToExercise" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "exercises_sourceApiId_key" ON "exercises"("sourceApiId");

-- CreateIndex
CREATE INDEX "exercises_visibility_ownerProfessionalId_idx" ON "exercises"("visibility", "ownerProfessionalId");

-- CreateIndex
CREATE UNIQUE INDEX "_ContraindicationTagToExercise_AB_unique" ON "_ContraindicationTagToExercise"("A", "B");

-- CreateIndex
CREATE INDEX "_ContraindicationTagToExercise_B_index" ON "_ContraindicationTagToExercise"("B");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_ownerProfessionalId_fkey" FOREIGN KEY ("ownerProfessionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContraindicationTagToExercise" ADD CONSTRAINT "_ContraindicationTagToExercise_A_fkey" FOREIGN KEY ("A") REFERENCES "contraindication_tags"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContraindicationTagToExercise" ADD CONSTRAINT "_ContraindicationTagToExercise_B_fkey" FOREIGN KEY ("B") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the canonical contraindication vocabulary (PRD 05 §6 — this module is
-- the owner; PRD 03 references these same `code` values on intake profiles).
-- Reference data lives in the migration so every environment (dev, test,
-- prod) gets the identical vocabulary deterministically.
INSERT INTO "contraindication_tags" ("code", "label", "description") VALUES
  ('LOWER_BACK_LOAD_CAUTION', 'Carga na lombar — cautela', 'Exercícios que aplicam carga axial ou de dobradiça sobre a coluna lombar (levantamentos, remadas curvadas). Cautela em histórico de lombalgia, hérnia ou ciática.'),
  ('SHOULDER_IMPINGEMENT_CAUTION', 'Pinçamento do ombro — cautela', 'Movimentos acima da cabeça ou de rotação interna sob carga que podem agravar síndrome do impacto ou tendinopatia do manguito rotador.'),
  ('KNEE_LOAD_CAUTION', 'Carga no joelho — cautela', 'Flexão profunda de joelho sob carga (agachamentos, avanços). Cautela em condropatia, pós-operatório de LCA/menisco ou dor patelofemoral.'),
  ('WRIST_LOAD_CAUTION', 'Carga no punho — cautela', 'Apoio ou pegada com o punho em extensão sob carga (flexões, pranchas, agachamento frontal). Cautela em tendinite ou síndrome do túnel do carpo.'),
  ('NECK_STRAIN_CAUTION', 'Tensão cervical — cautela', 'Movimentos que induzem tração ou compensação da cervical (abdominais puxando a nuca, encolhimento sob carga alta).'),
  ('HIP_MOBILITY_CAUTION', 'Mobilidade de quadril — cautela', 'Exige amplitude de flexão/rotação de quadril que pode ser limitada em pós-operatório, impacto femoroacetabular ou mobilidade reduzida.'),
  ('HIGH_IMPACT_CAUTION', 'Alto impacto — cautela', 'Saltos e movimentos pliométricos com picos de impacto articular. Cautela em osteoartrite, gestação, retorno pós-lesão ou condicionamento inicial.'),
  ('BLOOD_PRESSURE_CAUTION', 'Pressão arterial — cautela', 'Esforço intenso com manobra de Valsalva que eleva agudamente a pressão. Cautela em hipertensão não controlada ou condição cardiovascular.'),
  ('ELBOW_OVERUSE_CAUTION', 'Sobrecarga do cotovelo — cautela', 'Volume alto de tração ou extensão repetida (barras, roscas) que pode agravar epicondilite ou tendinopatia do cotovelo.')
ON CONFLICT ("code") DO NOTHING;
