# PRD 11 — Messaging

**Module:** Messaging
**Source:** Base document §5.11 (see also §3.3, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md)
**See also:** [`07-client-training-execution.md`](./07-client-training-execution.md) (shares the same form-check-video fast-follow item, §8)
**Referenced by (downstream consumers):** [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (unread count), [`12-notifications.md`](./12-notifications.md) ("new message" trigger)

---

## 1. Overview

A lightweight, text-only messaging thread between a Client and their linked Professional(s), scoped strictly to existing relationships defined in PRD 02. This is not a general chat product — it exists to support the coaching relationship (questions, check-ins, quick feedback) without requiring external tools like WhatsApp, which the product vision (§1) explicitly names as the "spreadsheet/WhatsApp chaos" this platform replaces.

## 2. Goals

- Let a Client message their linked Professional(s) and vice versa, in a simple thread per relationship.
- Keep v1 text-only, with attachments/video form-check explicitly deferred (ties into the same fast-follow as PRD 07 §5.5/§8).

## 3. Non-Goals

- No group threads, no messaging between Clients, no messaging with a Professional the Client is not currently linked to (per PRD 02's active-link requirement).
- No attachments or video in v1 — text only.
- No admin support-chat feature beyond what's already implied by base doc §4's "Messaging: Admin ✅ (support)" row — Admin support messaging is out of scope for this PRD's v1 (see §8).

## 4. Personas & Permissions

Per base doc §4, row "Messaging": Admin ✅ (support), Professional ✅ (own clients), Client ✅ (own professional).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Send/read messages in own thread | — | ✅ (own linked clients) | ✅ (own linked professionals) |
| Read/moderate any thread | ✅ | ❌ | ❌ |

## 5. Functional Requirements

### 5.1 Thread creation
- A `Message` thread is implicitly created (or reused if one already exists) the first time a Client and a Professional have an `ACTIVE` `ProfessionalClientLink` (PRD 02) — no separate "start a conversation" setup step.
- One thread per (Client, Professional) pair, regardless of which specialization(s) the link covers — if a Client has both a PT and a Nutritionist, they get two separate threads (one per Professional), not one merged thread.

### 5.2 Sending/reading
- Plain text messages only in v1, with a reasonable length cap (e.g., 2,000 characters) to keep this a chat tool, not a document-sharing tool.
- Standard read/unread state per message, surfaced as an unread count on the Today dashboard (PRD 09) and via Notifications (PRD 12).

### 5.3 Access revocation on unlink
- If a `ProfessionalClientLink` is unlinked (PRD 02 §5.4), the thread becomes **read-only** for both parties (history preserved, no new messages) rather than deleted — consistent with the "preserve history, gate future writes" pattern used elsewhere (e.g., PRD 02's unlink behavior for plans).

### 5.4 Output sanitization
- Message bodies are rendered as plain text only — no raw HTML rendering of user-generated content, per base doc §9's sanitization guidance. If rich text is ever introduced, it must go through sanitization (e.g., DOMPurify) before render; v1 avoids the risk entirely by not supporting rich text.

## 6. Data Model Additions

Uses base doc §6 `Message` directly:

- **MessageThread**: `professionalId`, `clientId`, `status` (`ACTIVE`/`READ_ONLY`, mirroring the link's status). This is a real, explicit entity (it has its own `id`, referenced by `Message.threadId` below) — the "no separate setup step" language in §5.1 describes the *user experience* (no button to press to create one), not the data model; the backend still creates a genuine `MessageThread` row the first time a `ProfessionalClientLink` becomes `ACTIVE`, one per (professionalId, clientId) pair, and keeps its `status` in sync whenever that link's status changes.
- **Message**: `threadId` (FK to `MessageThread.id`), `senderId`, `body` (plain text, length-capped), `attachments[]` (unused/empty in v1, reserved for the fast-follow), `sentAt`, `readAt` (nullable — the thread always has exactly one other party, so a single `readAt` unambiguously means "read by the recipient").

## 7. UX Notes

- Standard chat-thread UI, mobile-first — this is a secondary but frequent surface, not the primary landing screen.
- Unread badges should be consistent between the dedicated Messaging screen and the Today dashboard summary (PRD 09) — same source of truth, two surfaces.

## 8. Out of Scope / Future (Fast-Follow)

- Attachments and the async form-check video feedback flow (base doc §3.3) — ties directly into the same fast-follow item as PRD 07 §5.5/§8.
- A dedicated Admin↔User support-chat surface distinct from the Professional↔Client thread model described here.

## 9. Open Questions

- None blocking.

## 10. Acceptance Criteria

- A Client and a Professional with an `ACTIVE` link can exchange text messages in a shared thread.
- A Client with both a linked PT and a linked Nutritionist has two independent threads, not one merged thread.
- Unlinking a relationship makes its thread read-only (message history preserved) rather than deleting it.
- No user can read or send messages in a thread they are not a party to, enforced server-side.
- Message bodies are never rendered as raw HTML.
