// PT-BR display copy for Body Assessment (PRD 04) — mirrors
// features/intake/labels.ts's convention of one file per module for this.

export const SOURCE_LABELS: Record<string, string> = {
  SELF_REPORTED: "Auto-relatado",
  PROFESSIONAL_VALIDATED: "Validado por profissional",
};

export const GOAL_TYPE_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Perda de peso",
  MUSCLE_GAIN: "Ganho de massa muscular",
  RECOMPOSITION: "Recomposição corporal",
  PERFORMANCE: "Performance",
  REHABILITATION: "Reabilitação",
  OTHER: "Outro",
};

export const POSTURE_HEAD_POSITION_LABELS: Record<string, string> = {
  NEUTRAL: "Neutra",
  FORWARD: "Anteriorizada",
};

export const POSTURE_SHOULDER_LEVEL_LABELS: Record<string, string> = {
  SYMMETRIC: "Simétricos",
  ELEVATED_LEFT: "Elevado à esquerda",
  ELEVATED_RIGHT: "Elevado à direita",
};

export const POSTURE_SCAPULAR_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  WINGING: "Escápula alada",
};

export const POSTURE_SPINAL_CURVATURE_LABELS: Record<string, string> = {
  NONE: "Sem alteração",
  SUSPECTED_KYPHOSIS: "Suspeita de cifose",
  SUSPECTED_LORDOSIS: "Suspeita de lordose",
  SUSPECTED_SCOLIOSIS: "Suspeita de escoliose",
};

export const POSTURE_PELVIC_TILT_LABELS: Record<string, string> = {
  NEUTRAL: "Neutra",
  ANTERIOR: "Anteversão",
  POSTERIOR: "Retroversão",
};

export const POSTURE_KNEE_ALIGNMENT_LABELS: Record<string, string> = {
  NEUTRAL: "Neutro",
  VARUS: "Varo",
  VALGUS: "Valgo",
};

export const POSTURE_FOOT_POSTURE_LABELS: Record<string, string> = {
  NEUTRAL: "Neutro",
  PRONATED: "Pronado",
  SUPINATED: "Supinado",
};

export const SKINFOLD_SITE_LABELS: Record<string, string> = {
  chest: "Peitoral",
  midaxillary: "Axilar média",
  triceps: "Tríceps",
  subscapular: "Subescapular",
  abdominal: "Abdominal",
  suprailiac: "Suprailíaca",
  thigh: "Coxa",
};

export const CIRCUMFERENCE_LABELS: Record<string, string> = {
  neck: "Pescoço",
  chest: "Tórax",
  waist: "Cintura",
  hip: "Quadril",
  armRelaxed: "Braço relaxado",
  armFlexed: "Braço contraído",
  thigh: "Coxa",
  calf: "Panturrilha",
};
