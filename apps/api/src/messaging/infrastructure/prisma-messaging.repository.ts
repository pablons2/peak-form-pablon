import { Injectable } from "@nestjs/common";
import type { Message, MessageThreadStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  MessageThreadWithParties,
  MessagingRepository,
} from "../domain/ports/messaging.repository.port";

const WITH_PARTIES = { professional: true, client: true } as const;

@Injectable()
export class PrismaMessagingRepository implements MessagingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findThreadById(id: string): Promise<MessageThreadWithParties | null> {
    return this.prisma.messageThread.findUnique({
      where: { id },
      include: WITH_PARTIES,
    });
  }

  findThreadByPair(
    professionalId: string,
    clientId: string,
  ): Promise<MessageThreadWithParties | null> {
    return this.prisma.messageThread.findUnique({
      where: { professionalId_clientId: { professionalId, clientId } },
      include: WITH_PARTIES,
    });
  }

  upsertThreadForPair(
    professionalId: string,
    clientId: string,
    status: MessageThreadStatus,
  ): Promise<MessageThreadWithParties> {
    return this.prisma.messageThread.upsert({
      where: { professionalId_clientId: { professionalId, clientId } },
      create: { professionalId, clientId, status },
      update: { status },
      include: WITH_PARTIES,
    });
  }

  listThreadsForProfessional(professionalId: string): Promise<MessageThreadWithParties[]> {
    return this.prisma.messageThread.findMany({
      where: { professionalId },
      include: WITH_PARTIES,
      orderBy: { updatedAt: "desc" },
    });
  }

  listThreadsForClient(clientId: string): Promise<MessageThreadWithParties[]> {
    return this.prisma.messageThread.findMany({
      where: { clientId },
      include: WITH_PARTIES,
      orderBy: { updatedAt: "desc" },
    });
  }

  listMessages(threadId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { threadId },
      orderBy: { sentAt: "asc" },
    });
  }

  createMessage(threadId: string, senderId: string, body: string): Promise<Message> {
    return this.prisma.message.create({
      data: { threadId, senderId, body },
    });
  }

  async markReadForRecipient(threadId: string, readerId: string): Promise<number> {
    const result = await this.prisma.message.updateMany({
      where: { threadId, senderId: { not: readerId }, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  countUnread(threadId: string, viewerId: string): Promise<number> {
    return this.prisma.message.count({
      where: { threadId, senderId: { not: viewerId }, readAt: null },
    });
  }
}
