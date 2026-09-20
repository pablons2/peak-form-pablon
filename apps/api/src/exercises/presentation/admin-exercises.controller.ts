import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ExerciseVisibility, Role } from "@prisma/client";
import {
  updateExerciseSchema,
  upsertExerciseAsAdminSchema,
  type UpdateExerciseInput,
  type UpsertExerciseAsAdminInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CreateGlobalExerciseUseCase } from "../application/use-cases/create-global-exercise.use-case";
import { DeleteExerciseAsAdminUseCase } from "../application/use-cases/delete-exercise-as-admin.use-case";
import { PromoteExerciseUseCase } from "../application/use-cases/promote-exercise.use-case";
import { SearchExercisesUseCase } from "../application/use-cases/search-exercises.use-case";
import { UpdateExerciseAsAdminUseCase } from "../application/use-cases/update-exercise-as-admin.use-case";
import { toPublicExercise } from "./exercise.serializer";

// PRD 05 §4/§5.3 — Admin curation: the custom-exercise review queue, direct
// global authoring, editing any record, and promotion to the shared library.
@Roles(Role.ADMIN)
@Controller("admin/exercises")
export class AdminExercisesController {
  constructor(
    private readonly searchExercises: SearchExercisesUseCase,
    private readonly createGlobal: CreateGlobalExerciseUseCase,
    private readonly updateAsAdmin: UpdateExerciseAsAdminUseCase,
    private readonly deleteAsAdmin: DeleteExerciseAsAdminUseCase,
    private readonly promote: PromoteExerciseUseCase,
  ) {}

  // §5.3 review queue — ?visibility=PRIVATE lists every custom exercise
  // awaiting review; omit it for the whole catalog.
  @Get()
  listHandler(@CurrentUser() admin: UserWithProfiles, @Query("visibility") visibility?: string) {
    if (visibility && visibility !== "PRIVATE" && visibility !== "GLOBAL") {
      throw new BadRequestException(
        "visibility must be PRIVATE or GLOBAL",
      );
    }
    return this.searchExercises
      .execute({
        viewer: admin,
        filters: { visibility: visibility as ExerciseVisibility | undefined },
      })
      .then((exercises) => exercises.map(toPublicExercise));
  }

  @Post()
  createHandler(
    @Body(new ZodValidationPipe(upsertExerciseAsAdminSchema))
    body: UpsertExerciseAsAdminInput,
  ) {
    return this.createGlobal.execute({ data: body }).then(toPublicExercise);
  }

  @HttpCode(200)
  @Patch(":id")
  updateHandler(
    @Param("id") exerciseId: string,
    @Body(new ZodValidationPipe(updateExerciseSchema))
    body: UpdateExerciseInput,
  ) {
    return this.updateAsAdmin
      .execute({ exerciseId, data: body })
      .then(toPublicExercise);
  }

  @HttpCode(200)
  @Post(":id/promote")
  promoteHandler(
    @Param("id") exerciseId: string,
    @CurrentUser() admin: UserWithProfiles,
  ) {
    return this.promote
      .execute({ adminId: admin.id, exerciseId })
      .then(toPublicExercise);
  }

  @HttpCode(204)
  @Delete(":id")
  async deleteHandler(@Param("id") exerciseId: string, @CurrentUser() admin: UserWithProfiles) {
    await this.deleteAsAdmin.execute({ adminId: admin.id, exerciseId });
  }
}
