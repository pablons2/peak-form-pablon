// pt-BR display copy for the intake vocabularies (PRD 03). The enum/code
// values are the wire format shared with apps/api/src/intake/domain/
// par-q-questions.ts; this is what humans read. Same split as PRD 05's
// MUSCLE_GROUP_LABELS.

// §5.1 — the PAR-Q-style readiness screen. Order matches
// apps/api/src/intake/domain/par-q-questions.ts's PARQ_QUESTION_CODES.
export const PARQ_QUESTIONS: { code: string; question: string }[] = [
  {
    code: "HEART_CONDITION",
    question:
      "Algum médico já disse que você possui um problema cardíaco e que só deveria praticar atividade física sob recomendação médica?",
  },
  {
    code: "CHEST_PAIN",
    question: "Você sente dor no peito quando pratica atividade física?",
  },
  {
    code: "DIZZINESS_BALANCE",
    question:
      "No último ano, você perdeu o equilíbrio por causa de tontura ou já perdeu a consciência?",
  },
  {
    code: "BONE_JOINT_PROBLEM",
    question:
      "Você tem algum problema ósseo ou articular que poderia piorar com uma mudança na sua atividade física?",
  },
  {
    code: "BLOOD_PRESSURE_MEDICATION",
    question:
      "Você toma atualmente algum medicamento para pressão arterial ou para o coração?",
  },
  {
    code: "OTHER_MEDICAL_REASON",
    question:
      "Você conhece qualquer outro motivo pelo qual não deveria praticar atividade física sem supervisão médica?",
  },
];

// §5.1/§7 — front/back body-map picker regions.
export const BODY_REGION_LABELS: Record<string, string> = {
  NECK: "Pescoço",
  SHOULDER_LEFT: "Ombro esquerdo",
  SHOULDER_RIGHT: "Ombro direito",
  UPPER_BACK: "Parte superior das costas",
  LOWER_BACK: "Lombar",
  CHEST: "Peito",
  ABDOMEN: "Abdômen",
  HIP_LEFT: "Quadril esquerdo",
  HIP_RIGHT: "Quadril direito",
  ELBOW_LEFT: "Cotovelo esquerdo",
  ELBOW_RIGHT: "Cotovelo direito",
  WRIST_LEFT: "Punho esquerdo",
  WRIST_RIGHT: "Punho direito",
  KNEE_LEFT: "Joelho esquerdo",
  KNEE_RIGHT: "Joelho direito",
  ANKLE_LEFT: "Tornozelo esquerdo",
  ANKLE_RIGHT: "Tornozelo direito",
};

// Front-silhouette vs. back-silhouette split, purely for the two-tab picker
// layout — no semantic effect on the stored data.
export const FRONT_BODY_REGIONS = [
  "NECK",
  "SHOULDER_LEFT",
  "SHOULDER_RIGHT",
  "CHEST",
  "ABDOMEN",
  "HIP_LEFT",
  "HIP_RIGHT",
  "ELBOW_LEFT",
  "ELBOW_RIGHT",
  "WRIST_LEFT",
  "WRIST_RIGHT",
  "KNEE_LEFT",
  "KNEE_RIGHT",
  "ANKLE_LEFT",
  "ANKLE_RIGHT",
] as const;

export const BACK_BODY_REGIONS = ["UPPER_BACK", "LOWER_BACK"] as const;

export const MEDICAL_CONDITION_LABELS: Record<string, string> = {
  DIABETES: "Diabetes",
  CARDIOVASCULAR_DISEASE: "Doença cardiovascular",
  HYPERTENSION: "Hipertensão",
  ASTHMA_OR_RESPIRATORY: "Asma ou condição respiratória",
  PREGNANCY: "Gestação",
  OTHER: "Outra",
};

export const INTAKE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Completo",
  SKIPPED_WITH_ACKNOWLEDGEMENT: "Ignorado (com ciência de risco)",
};
