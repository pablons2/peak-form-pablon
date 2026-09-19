// Shared TypeScript types between apps/api and apps/web.
// Populated as each module (docs/prds/01-*.md onward) is implemented —
// do not hand-duplicate a type that already exists in packages/validation's
// inferred zod types; import from there instead when a runtime schema exists.

export type Role = "ADMIN" | "PROFESSIONAL" | "CLIENT";

export type Specialization = "PERSONAL_TRAINER" | "NUTRITIONIST";
