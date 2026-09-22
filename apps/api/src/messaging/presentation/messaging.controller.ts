import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { sendMessageSchema, type SendMessageInput } from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { GetThreadUseCase } from "../application/use-cases/get-thread.use-case";
import { GetThreadWithUseCase } from "../application/use-cases/get-thread-with.use-case";
import { ListMyThreadsUseCase } from "../application/use-cases/list-my-threads.use-case";
import { SendMessageUseCase } from "../application/use-cases/send-message.use-case";
import { toPublicMessage, toPublicThread } from "./messaging.serializer";

// PRD 11 §4/§5 — the Messaging module. Professional/Client write their own
// threads; Admin gets read-only "support" access to any single thread by
// id (§4's "Read/moderate any thread" row) with no dedicated inbox and no
// write path at all (§3 Non-Goals — no admin support-chat surface in v1).
@Controller("messaging")
export class MessagingController {
  constructor(
    private readonly listMyThreads: ListMyThreadsUseCase,
    private readonly getThread: GetThreadUseCase,
    private readonly getThreadWith: GetThreadWithUseCase,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  // §7 — the caller's own inbox (Professional or Client only).
  @Roles(Role.PROFESSIONAL, Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Get("threads")
  async listThreadsHandler(@CurrentUser() user: UserWithProfiles) {
    const summaries = await this.listMyThreads.execute({
      viewer: { id: user.id, role: user.role },
    });
    return {
      threads: summaries.map((s) => ({
        ...toPublicThread(s.thread),
        unreadCount: s.unreadCount,
      })),
    };
  }

  // Deep-link resolver used by /clients/[linkId] and /team — "the thread
  // with this other user," not a threadId. `{ thread: null }` (not 404)
  // when none exists yet (see the use-case's own comment on why).
  @Roles(Role.PROFESSIONAL, Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Get("threads/with/:otherUserId")
  async getThreadWithHandler(
    @Param("otherUserId") otherUserId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const thread = await this.getThreadWith.execute({
      actor: { id: user.id, role: user.role },
      otherUserId,
    });
    return { thread: thread ? toPublicThread(thread) : null };
  }

  // §5.2 — full history + marks the other party's messages read (except for
  // an Admin viewer, whose support access must not mutate real-party state).
  @Roles(Role.PROFESSIONAL, Role.CLIENT, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @Get("threads/:id")
  async getThreadHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const { thread, messages } = await this.getThread.execute({
      viewer: { id: user.id, role: user.role },
      threadId: id,
    });
    return {
      thread: toPublicThread(thread),
      messages: messages.map(toPublicMessage),
    };
  }

  // §5.2 — send a plain-text message. 404 on a non-party thread, 403 on a
  // READ_ONLY one or an Admin attempting to write at all.
  @Roles(Role.PROFESSIONAL, Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post("threads/:id/messages")
  async sendMessageHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    const message = await this.sendMessage.execute({
      actor: { id: user.id, role: user.role },
      threadId: id,
      body: body.body,
    });
    return toPublicMessage(message);
  }
}
