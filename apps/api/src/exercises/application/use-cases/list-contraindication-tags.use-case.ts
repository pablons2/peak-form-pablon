import { Inject, Injectable } from "@nestjs/common";
import {
  CONTRAINDICATION_TAG_REPOSITORY,
  type ContraindicationTagRepository,
} from "../../domain/ports/contraindication-tag.repository.port";

// PRD 05 §6 — expose the module-owned contraindication vocabulary so the
// authoring form can render real choices and PRD 03/06 can reference the
// same codes.
@Injectable()
export class ListContraindicationTagsUseCase {
  constructor(
    @Inject(CONTRAINDICATION_TAG_REPOSITORY)
    private readonly tags: ContraindicationTagRepository,
  ) {}

  execute() {
    return this.tags.listAll();
  }
}
