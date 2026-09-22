# PRD 01 — Authentication & Account Management

**Module:** Authentication & Account Management
**Source:** Base document §5.1 (see also §7.3, §9)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md)
**Referenced by (downstream consumers):** [`02-professional-client-relationship.md`](./02-professional-client-relationship.md) (`APPROVED` status gate), [`12-notifications.md`](./12-notifications.md) (approval-decision trigger), [`13-admin-console.md`](./13-admin-console.md) (approval queue, user management)

---

## 1. Overview

Authentication and account management is the entry point for every persona (Admin, Professional, Client) and the foundation every other module builds on. It establishes identity, session handling, and account lifecycle (signup, verification, password reset, deactivation), and encodes the role/approval rules described in the base document.

## 2. Goals

- Let Clients sign up and start using the app immediately (email+password or Google OAuth), with no approval gate.
- Let Professionals sign up but require **manual Admin approval** before they can act on any client (per [decision 3.4](./00-shared-reference-and-decisions.md#34-professional-credential-verification--manual-approval-no-document-upload-in-v1-resolves-base-doc-113)).
- Provide secure session handling: short-lived access token + httpOnly refresh token, backend-verified on every request.
- Support standard account lifecycle: email verification, password reset, account deactivation.

## 3. Non-Goals

- No document/license upload for credential verification in v1 (fast-follow — see §8).
- No multi-tenant/organization concept (per [decision 3.1](./00-shared-reference-and-decisions.md#31-deployment-model--single-practice-tool-resolves-base-doc-114)) — a single flat pool of Admin/Professional/Client accounts.
- No SSO providers beyond Google OAuth in v1.
- No native mobile session handling (per [decision 3.2](./00-shared-reference-and-decisions.md#32-platform--responsive-web-only-no-native-app-resolves-base-doc-116)).

## 4. Personas & Permissions

Uses the RBAC roles from base doc §4 (`ADMIN`, `PROFESSIONAL`, `CLIENT`). This module is where the role is assigned and where a Professional's `specializations[]` (`PERSONAL_TRAINER`, `NUTRITIONIST`, or both) is set.

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Self-signup | — | ✅ (enters `PENDING_APPROVAL`) | ✅ (immediately active) |
| Approve/reject Professional signup | ✅ | ❌ | — |
| Login (credentials or Google) | ✅ | ✅ (always — access to Professional-only features is gated separately by `approvalStatus`, see §5.1) | ✅ |
| Reset own password | ✅ | ✅ | ✅ |
| Deactivate own account | ✅ | ✅ | ✅ |
| Deactivate another user's account | ✅ | ❌ | ❌ |
| Assign/change specializations | ✅ | ➕ propose own (Admin confirms) | — |

## 5. Functional Requirements

### 5.1 Sign up
- **Client:** email+password or Google OAuth. `User.status` is `ACTIVE` immediately after email verification (credentials flow) or immediately (OAuth flow, email already verified by Google). During signup, a Client also provides `dateOfBirth` and `biologicalSex` (`MALE`/`FEMALE`) — required, not optional (see §6) — because these are inputs to formulas used later by PRD 04 (Jackson & Pollock body-fat estimate) and PRD 08 (Mifflin-St Jeor BMR/TDEE estimate); collecting them once at signup avoids blocking those modules on a missing field later.
- **Professional:** same auth methods. `User.status` is `ACTIVE` immediately (a Professional account is a normal, logged-in-capable account from the start — see §5.3 on login). What's gated is the separate `ProfessionalProfile.approvalStatus`, which starts as `PENDING_APPROVAL`. Signup form additionally collects: full name, specialization(s) requested (`PERSONAL_TRAINER` / `NUTRITIONIST` / both), and a free-text field for how the Admin can verify them (e.g., "CREF number", "referred by X") — stored as plain text, not a document upload (see §8).
- A Professional whose `approvalStatus` is `PENDING_APPROVAL` can log in and see a "waiting for approval" screen but cannot access any Professional-only feature (plan builder, client list, messaging) until `approvalStatus` is `APPROVED`.

### 5.2 Email verification
- Credentials-based signups require email verification via a time-limited token link before first login (Client and Professional alike).
- Google OAuth signups skip this step (email already verified by the provider).

### 5.3 Login
- Credentials (email+password) and Google OAuth, both always available, implemented via NextAuth.js (Auth.js) on the frontend.
- On successful login, the API issues a short-lived JWT access token + an httpOnly refresh token cookie. Every subsequent API request is authenticated by validating the access token server-side (never trust frontend-only role/session state).
- Failed login attempts are rate-limited (see base doc §9).

### 5.4 Password reset
- Standard "forgot password" flow: email with time-limited reset token, new password form, invalidate all existing sessions for that user on successful reset.

### 5.5 Account deactivation & reactivation
- A user can deactivate their own account (soft delete — status set to `DEACTIVATED`, data retained per LGPD retention policy, not immediately purged).
- Admin can deactivate any account (e.g., a Professional who churns, a Client who requests deletion).
- A deactivated Professional's active Client links are flagged for the Admin to reassign or notify affected Clients — this module only sets the state; the reassignment flow itself belongs to PRD 02 (Professional ↔ Client Relationship).
- **Reactivation:** only Admin can reactivate a `DEACTIVATED` account (a user cannot self-reactivate — they must contact the Admin, since self-deactivation is a deliberate action). Reactivating sets `status` back to `ACTIVE` and does not change `ProfessionalProfile.approvalStatus` — a reactivated Professional who was `APPROVED` before deactivation is `APPROVED` again immediately; a reactivated Professional who was `REJECTED` remains `REJECTED` (deactivation/reactivation is orthogonal to the approval decision, not a way to bypass it). Reactivation does **not** automatically restore any `ProfessionalClientLink` that was force-unlinked during deactivation (PRD 02 §5.5) — those must be re-established explicitly.

### 5.6 Professional approval queue
- Admin sees a list of `PENDING_APPROVAL` Professional accounts with their submitted verification note.
- Admin can `APPROVE` (`approvalStatus` becomes `APPROVED`, specializations locked in) or `REJECT` (`approvalStatus` becomes `REJECTED`, user notified by email). Either way, `User.status` itself stays `ACTIVE` — rejection is not a deactivation, it only permanently blocks access to Professional-only features via the `approvalStatus` check; the record is kept (not deleted) for audit purposes and the person can still log in and see their rejection status.
- Every approval/rejection is written to the audit log (base doc §9) with actor, timestamp, and decision.

## 6. Data Model Additions

Extends base doc §6 `User`, `ProfessionalProfile`, and `ClientProfile` entities — no new top-level entities beyond what the base document already names:

- **User**: `email`, `passwordHash` (nullable if OAuth-only), `oauthProviders[]`, `role` (`ADMIN`/`PROFESSIONAL`/`CLIENT`), `emailVerifiedAt`, `status` (`ACTIVE`/`DEACTIVATED`), `createdAt`.
- **ProfessionalProfile** (1:1 with a `PROFESSIONAL` User): `specializations[]`, `approvalStatus` (`PENDING_APPROVAL`/`APPROVED`/`REJECTED`), `verificationNote` (free text), `approvedBy` (Admin User FK, nullable), `approvedAt` (nullable).
- **ClientProfile** (1:1 with a `CLIENT` User — this is the same entity named in base doc §6, fleshed out here since no other PRD owns it): `dateOfBirth` (required), `biologicalSex` (`MALE`/`FEMALE`, required). These two fields exist specifically to feed the sex-specific, age-dependent clinical formulas used downstream — the Jackson & Pollock body-density equation (PRD 04 §5.2) and the Mifflin-St Jeor BMR estimate (PRD 08 §5.1) — so neither of those modules has to re-collect or guess this data. Age for a given calculation is always **computed from `dateOfBirth` at the time of that calculation** (e.g., at a `BodyAssessment`'s `recordedAt`), never stored as a raw "age" value, since a stored age would silently go stale on every past record as time passes.

## 7. UX Notes

- Signup form for Professionals clearly states "Your account will be reviewed by an administrator before you can create plans for clients" — sets expectations up front so it isn't a surprise after signup.
- Mobile-first forms (base doc §10) — this is often the very first screen a user sees on a phone.

## 8. Out of Scope / Future (Fast-Follow)

- Document/license upload for Professional credential verification (base doc §11.3) — replace the free-text verification note with an actual file upload + Admin review UI once volume justifies it.
- Additional OAuth providers (Apple, Facebook) if requested later.
- Two-factor authentication.

## 9. Open Questions

- None blocking for this PRD specifically. Cross-cutting LGPD legal review (base doc §11.7) still applies before production launch with real user data.

## 10. Acceptance Criteria

- A Client can sign up with email+password, verify email, and log in without any manual approval step.
- A Client can sign up and log in via Google OAuth with no separate email-verification step.
- A Professional who signs up cannot access plan-builder or client-list screens until an Admin approves their account.
- An Admin can view a queue of pending Professional accounts and approve/reject each one; the decision is reflected in the Professional's access immediately and recorded in the audit log.
- All authenticated API requests are rejected (401) if the access token is missing, expired, or invalid — enforced server-side regardless of what the frontend renders.
- Password reset invalidates all prior sessions for that account.
- A Client cannot complete signup without providing `dateOfBirth` and `biologicalSex`; both are persisted on `ClientProfile` and readable by PRD 04 and PRD 08 for their respective formulas.
- Reactivating a `DEACTIVATED` account restores `User.status` to `ACTIVE` without altering `ProfessionalProfile.approvalStatus`, and without restoring any previously force-unlinked `ProfessionalClientLink`.
