# PRD 13 — Admin Console

**Module:** Admin Console
**Source:** Base document §5.13 (see also §4, §9)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`01-authentication-account-management.md`](./01-authentication-account-management.md), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md) (force-unlink), [`05-exercise-library.md`](./05-exercise-library.md)

---

## 1. Overview

The Admin Console is the operator-facing surface for user/role management, Professional approval, global exercise-library curation, audit-log review, and basic usage analytics. Per [decision 3.1](./00-shared-reference-and-decisions.md#31-deployment-model--single-practice-tool-resolves-base-doc-114), this is scoped to a **single-practice** deployment — there is no multi-tenant billing, plan-tier gating, or tenant-switching UI to build.

## 2. Goals

- Give the Admin full visibility and control over Users, Professional approvals, the global Exercise Library, and the Audit Log.
- Provide basic usage analytics (active Clients, active Professionals, adherence trends at an aggregate level) without needing a separate BI tool for v1.

## 3. Non-Goals

- No multi-tenant/organization management (per decision 3.1) — one flat Admin scope.
- No billing/subscription management UI — not needed for a single-practice tool in v1.
- No fine-grained permission customization beyond the fixed Admin/Professional/Client roles defined in base doc §4 — RBAC is not admin-configurable in v1, it's fixed at the code level.

## 4. Personas & Permissions

This module is Admin-only by definition; the table below restates the relevant rows from base doc §4 for context.

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Manage users/roles | ✅ | ❌ | ❌ |
| Approve/reject Professional signups | ✅ | ❌ | ❌ |
| Manage global exercise library | ✅ | ➕ propose only | ❌ |
| Force-unlink Professional↔Client | ✅ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ |
| View aggregate usage analytics | ✅ | ❌ (own-client-scoped analytics live in owning modules) | ❌ |

## 5. Functional Requirements

### 5.1 User & role management
- List/search all Users (Admin, Professional, Client) with status (active/deactivated/pending approval).
- Deactivate/reactivate any account (ties into PRD 01 §5.5).
- View a User's role and, for Professionals, their `specializations[]` and approval status.

### 5.2 Professional approval queue
- Surfaces the `PENDING_APPROVAL` queue defined in PRD 01 §5.6: verification note, requested specializations, approve/reject actions, all writing to the audit log.

### 5.3 Global exercise-library curation
- Full CRUD on global `Exercise` records (PRD 05 §5.3).
- Review queue for Professional-proposed custom exercises awaiting promotion to global visibility.

### 5.4 Relationship oversight
- View all `ProfessionalClientLink` records, with the ability to force-unlink (PRD 02 §5.5) for dispute resolution or cleanup after a Professional deactivation.

### 5.5 Audit log
- Read-only, filterable view (by actor, action type, entity, date range) over the `AuditLog` entity (base doc §6/§9), covering every Professional action that mutates a Client's plan/targets, every approval/rejection decision, and every forced unlink.
- Audit log itself is append-only and not editable/deletable from this console.

### 5.6 Basic usage analytics
- Aggregate, non-per-client dashboard: total active Clients, total active Professionals (by specialization), overall average weekly adherence % (training and nutrition, aggregated across all Clients, no individual drill-down needed here — that already exists per-client in PRDs 06–09).

## 6. Data Model Additions

No new entities beyond what's already defined in base doc §6 (`User`, `ProfessionalProfile`, `ProfessionalClientLink`, `Exercise`, `AuditLog`) and PRD 01's `approvalStatus` field. This module is primarily a read/curation surface over existing entities plus the audit-writing side-effects already specified in the modules it touches.

## 7. UX Notes

- Desktop-friendly-first (like PRD 06) — this is an internal operator tool, not a Client-facing mobile screen, though it should remain usable on tablet at minimum per base doc §10's general responsiveness expectation.

## 8. Out of Scope / Future (Fast-Follow)

- Multi-tenant organization management, billing/subscription tiers (if the single-practice decision is revisited later — see [decision 3.1](./00-shared-reference-and-decisions.md#31-deployment-model--single-practice-tool-resolves-base-doc-114)).
- Configurable/custom roles beyond Admin/Professional/Client.
- Document/license upload review UI (ties into PRD 01 §8's fast-follow for credential verification).

## 9. Open Questions

- None blocking for the single-practice v1 scope. Revisit this entire PRD's boundaries if the business later decides to pursue multi-tenant SaaS (base doc §11.4).

## 10. Acceptance Criteria

- Admin can view, deactivate, and reactivate any user account.
- Admin can approve or reject a pending Professional signup, and the decision is immediately reflected in that Professional's access and recorded in the audit log.
- Admin can create/edit global exercises and promote a Professional's proposed custom exercise to global visibility.
- Admin can force-unlink any Professional↔Client relationship.
- The audit log is viewable and filterable but not editable or deletable through any Admin Console action.
