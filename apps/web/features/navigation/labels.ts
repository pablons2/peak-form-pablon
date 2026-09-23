// Flat label map, matching every other feature's labels.ts convention
// (e.g. features/relationships/labels.ts) — no shared/master labels file
// exists in this repo, each feature owns its own. `satisfies` (not a
// `Record<string, string>` annotation) keeps each key's literal type, so
// `NAV_ITEM_LABELS.home` is `string`, not `string | undefined` — unlike the
// other label maps, every access here uses a key this file itself hardcodes,
// never a dynamic value, so noUncheckedIndexedAccess's usual `?? fallback`
// convention isn't needed.
export const NAV_ITEM_LABELS = {
  home: "Início",
  intake: "Triagem",
  today: "Hoje",
  nutrition: "Nutrição",
  habits: "Hábitos",
  messages: "Mensagens",
  clients: "Clientes",
  plans: "Planos",
  exercises: "Exercícios",
  adminExercises: "Revisão de exercícios",
  notifications: "Notificações",
  theme: "Alternar tema",
} satisfies Record<string, string>;
