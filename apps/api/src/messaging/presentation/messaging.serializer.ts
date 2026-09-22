import type { Message } from "@prisma/client";
import type { MessageThreadWithParties } from "../domain/ports/messaging.repository.port";

export function toPublicThread(thread: MessageThreadWithParties) {
  return {
    id: thread.id,
    status: thread.status,
    professional: {
      id: thread.professional.id,
      fullName: thread.professional.fullName,
    },
    client: {
      id: thread.client.id,
      fullName: thread.client.fullName,
    },
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

export function toPublicMessage(message: Message) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    body: message.body,
    sentAt: message.sentAt.toISOString(),
    readAt: message.readAt ? message.readAt.toISOString() : null,
  };
}
