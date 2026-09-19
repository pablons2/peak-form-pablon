// Single source of truth for input-validation rules, shared between
// apps/api (the actual security boundary — base doc §9) and apps/web
// (UX-only convenience; the backend re-validates independently).
//
// One file per module PRD, named after its slug, added as each module is
// implemented.

export * from "./auth/schemas";
