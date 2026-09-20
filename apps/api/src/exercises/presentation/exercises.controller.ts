import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  createCustomExerciseSchema,
  exerciseSearchSchema,
  updateExerciseSchema,
  type CreateCustomExerciseInput,
  type ExerciseSearchInput,
  type UpdateExerciseInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CreateCustomExerciseUseCase } from "../application/use-cases/create-custom-exercise.use-case";
import { DeleteCustomExerciseUseCase } from "../application/use-cases/delete-custom-exercise.use-case";
import { GetExerciseUseCase } from "../application/use-cases/get-exercise.use-case";
import { ListContraindicationTagsUseCase } from "../application/use-cases/list-contraindication-tags.use-case";
import { SearchExercisesUseCase } from "../application/use-cases/search-exercises.use-case";
import { UpdateCustomExerciseUseCase } from "../application/use-cases/update-custom-exercise.use-case";
import { toPublicExercise } from "./exercise.serializer";

// PRD 05 §4/§5.3/§5.4 — the exercise catalog. Reads are open to every
// authenticated role (Clients are read-only per §4) with visibility scoping
// resolved in the use-cases; writes are Professional(+Admin)-only and gated
// by ApprovalStatusGuard like every other Professional feature.
@Controller("exercises")
export class ExercisesController {
  constructor(
    private readonly searchExercises: SearchExercisesUseCase,
    private readonly getExercise: GetExerciseUseCase,
    private readonly listTags: ListContraindicationTagsUseCase,
    private readonly createCustom: CreateCustomExerciseUseCase,
    private readonly updateCustom: UpdateCustomExerciseUseCase,
    private readonly deleteCustom: DeleteCustomExerciseUseCase,
  ) {}

  // §6 — the module-owned contraindication vocabulary (authoring form +
  // PRD 03/06 consumers). Declared before ":id" so the literal wins.
  @Get("contraindication-tags")
  tagsHandler() {
    return this.listTags.execute();
  }

  // §5.3 — the caller's own authored customs (Professionals, and Admins who
  // can also author customs per §4). Clients get an empty list.
  @Get("mine")
  mineHandler(@CurrentUser() user: UserWithProfiles) {
    return this.searchExercises
      .execute({ viewer: user, filters: { mine: true } })
      .then((exercises) => exercises.map(toPublicExercise));
  }

  // §5.4 — library search/filter; visibility scoping is applied server-side
  // so a PRIVATE custom never appears in another account's results.
  @Get()
  searchHandler(
    @CurrentUser() user: UserWithProfiles,
    @Query(new ZodValidationPipe(exerciseSearchSchema))
    filters: ExerciseSearchInput,
  ) {
    return this.searchExercises
      .execute({ viewer: user, filters })
      .then((exercises) => exercises.map(toPublicExercise));
  }

  @Get(":id")
  getHandler(
    @Param("id") exerciseId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.getExercise
      .execute({ viewer: user, exerciseId })
      .then(toPublicExercise);
  }

  // §5.3 — custom-exercise authoring. §4 lets Admins use these too; the
  // ApprovalStatusGuard passes non-Professionals through.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @Post("custom")
  createCustomHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createCustomExerciseSchema))
    body: CreateCustomExerciseInput,
  ) {
    return this.createCustom
      .execute({ owner: user, data: body })
      .then(toPublicExercise);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(200)
  @Patch("custom/:id")
  updateCustomHandler(
    @Param("id") exerciseId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateExerciseSchema))
    body: UpdateExerciseInput,
  ) {
    return this.updateCustom
      .execute({ actor: user, exerciseId, data: body })
      .then(toPublicExercise);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(204)
  @Delete("custom/:id")
  async deleteCustomHandler(
    @Param("id") exerciseId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    await this.deleteCustom.execute({ actor: user, exerciseId });
  }
}
