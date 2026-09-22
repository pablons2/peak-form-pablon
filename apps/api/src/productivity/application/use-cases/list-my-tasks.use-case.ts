import { Inject, Injectable } from "@nestjs/common";
import type { PersonalTask } from "@prisma/client";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";

// PRD 10 §5.3 — the Client's own flat task list. Ordering (pending before
// done, each group oldest-first) is the repository's concern — see
// PrismaProductivityRepository.listTasksForClient's comment.
@Injectable()
export class ListMyTasksUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
  ) {}

  execute(input: { clientId: string }): Promise<PersonalTask[]> {
    return this.productivity.listTasksForClient(input.clientId);
  }
}
