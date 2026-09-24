import { Controller, Post, Query, HttpCode, UseGuards } from "@nestjs/common";
import { Roles, Role } from "@/auth/roles.decorator";
import { ApprovalStatusGuard } from "@/auth/approval-status.guard";
import { SyncExerciseMediaService } from "../infrastructure/sync-exercise-media.service";

@Controller("admin/exercises/sync")
export class SyncController {
  constructor(private syncService: SyncExerciseMediaService) {}

  @Post("media-from-dataset")
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  async syncMediaFromDataset(
    @Query("datasetPath") datasetPath: string = "/tmp/exercises-dataset",
  ) {
    const result = await this.syncService.syncMediaFromDataset(datasetPath);
    return {
      message: "Sync completed",
      ...result,
    };
  }
}
