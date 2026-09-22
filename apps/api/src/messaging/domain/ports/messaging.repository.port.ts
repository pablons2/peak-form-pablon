import type { Message, MessageThread, MessageThreadStatus, User } from "@prisma/client";

export const MESSAGING_REPOSITORY = Symbol("MESSAGING_REPOSITORY");

export type MessageThreadWithParties = MessageThread & {
  professional: User;
  client: User;
};

/// Infrastructure implements this (base doc §7.2 DIP). Deliberately
/// CRUD/query-shaped — the business rules (who may read/write, the
/// ACTIVE/READ_ONLY lifecycle) live in the Application layer.
export interface MessagingRepository {
  findThreadById(id: string): Promise<MessageThreadWithParties | null>;
  findThreadByPair(
    professionalId: string,
    clientId: string,
  ): Promise<MessageThreadWithParties | null>;

  /// PRD 11 §5.1/§5.3 — creates the pair's thread if none exists yet, or
  /// updates its status if one already does (e.g. re-linking after a prior
  /// UNLINKED cycle reactivates the same thread rather than creating a
  /// second one for the same pair — the unique (professionalId, clientId)
  /// constraint makes a second one impossible anyway).
  upsertThreadForPair(
    professionalId: string,
    clientId: string,
    status: MessageThreadStatus,
  ): Promise<MessageThreadWithParties>;

  listThreadsForProfessional(professionalId: string): Promise<MessageThreadWithParties[]>;
  listThreadsForClient(clientId: string): Promise<MessageThreadWithParties[]>;

  listMessages(threadId: string): Promise<Message[]>;
  createMessage(threadId: string, senderId: string, body: string): Promise<Message>;

  /// Marks every message in the thread NOT sent by `readerId` as read.
  /// Returns the number of rows actually updated.
  markReadForRecipient(threadId: string, readerId: string): Promise<number>;

  /// Unread count for one viewer in one thread (messages sent by the other
  /// party with readAt still null).
  countUnread(threadId: string, viewerId: string): Promise<number>;
}
