import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCTIVITY_REPOSITORY,
  type HabitDefinitionWithCheckIns,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";

// PRD 10 §5.1/§10 — the Client's own non-archived habits, each with its
// full check-in history (the serializer computes streak/checkedToday from
// it — see productivity.serializer.ts).
@Injectable()
export class ListMyHabitsUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
  ) {}

  execute(input: { clientId: string }): Promise<HabitDefinitionWithCheckIns[]> {
    return this.productivity.listActiveHabitsForClient(input.clientId);
  }
}
