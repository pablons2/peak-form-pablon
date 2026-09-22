import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import type { RequestPhotoUploadUrlInput } from "@peakform/validation";
import {
  SIGNED_MEDIA_STORE,
  type SignedMediaStore,
} from "../../domain/ports/signed-media-store.port";
import { BodyAssessmentAccess } from "../body-assessment-access.service";

// PRD 04 §5.7 — step 1 of the photo-upload flow: mint a presigned PUT URL
// and the object key the browser will upload to directly. The key (not a
// URL) is what later gets embedded in a self-log/formal-assessment create
// call.
@Injectable()
export class RequestPhotoUploadUrlUseCase {
  constructor(
    @Inject(SIGNED_MEDIA_STORE) private readonly store: SignedMediaStore,
    private readonly access: BodyAssessmentAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    clientId: string;
    data: RequestPhotoUploadUrlInput;
  }): Promise<{ uploadUrl: string; key: string }> {
    await this.access.assertCanUploadPhotoFor(input.actor, input.clientId);

    const key = `body-assessments/${input.clientId}/${randomUUID()}`;
    const uploadUrl = await this.store.createUploadUrl(
      key,
      input.data.contentType,
    );
    return { uploadUrl, key };
  }
}
