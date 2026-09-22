"use server";

// Server actions for Body Assessment (PRD 04). Same contract as
// features/intake/actions.ts: re-validate with the shared zod schema,
// attach the session access token, map the API result onto {ok, message}.
//
// Photo upload (§5.7): rather than have the browser PUT bytes directly to
// MinIO (which would need CORS configured on the bucket — extra infra this
// module doesn't otherwise need), the file is handed to the server action
// as a native `File` (Next.js server actions serialize these across the
// wire on their own) and *this* server mints the presigned PUT URL and
// performs the upload itself, immediately, before ever creating the
// BodyAssessment row. The photo never touches a public URL either way —
// this only changes which process holds the presigned URL briefly.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  createFormalAssessmentSchema,
  createSelfLogSchema,
  type CreateFormalAssessmentInput,
  type CreateSelfLogInput,
  type PhotoTagInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";
import type { PublicBodyAssessment } from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
  entry?: PublicBodyAssessment;
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) {
    return null;
  }
  return { token: session.accessToken, userId: session.user.id };
}

async function uploadPhoto(
  token: string,
  clientId: string,
  tag: PhotoTagInput,
  photo: File,
): Promise<{ ok: true; key: string } | { ok: false; message: string }> {
  const contentType = photo.type;
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return { ok: false, message: "Formato de imagem não suportado." };
  }
  const urlResult = await api.requestPhotoUploadUrl(token, clientId, {
    tag,
    contentType: contentType as "image/jpeg" | "image/png" | "image/webp",
  });
  if (!urlResult.ok) return { ok: false, message: urlResult.message };

  const bytes = await photo.arrayBuffer();
  const putRes = await fetch(urlResult.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    return { ok: false, message: "Falha ao enviar a foto — tente novamente." };
  }
  return { ok: true, key: urlResult.data.key };
}

// §5.1/§7 — the Client's own quick self-log. `photo` is optional; kept as a
// single field (not an array) to match the <15s "quick" scope the PRD asks
// for.
export async function createSelfLogAction(input: {
  weight: number;
  note?: string;
  photo?: File | null;
}): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");

  let photoKey: string | undefined;
  if (input.photo && input.photo.size > 0) {
    const uploaded = await uploadPhoto(
      session.token,
      session.userId,
      "PROGRESS",
      input.photo,
    );
    if (!uploaded.ok) return fail(uploaded.message);
    photoKey = uploaded.key;
  }

  const parsed = createSelfLogSchema.safeParse({
    weight: input.weight,
    note: input.note ?? null,
    photoKey: photoKey ?? null,
  } satisfies CreateSelfLogInput);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.createSelfLog(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/body-assessments");
  return { ok: true, entry: result.data };
}

export async function getMyBodyAssessmentsAction() {
  const session = await requireSession();
  if (!session) return [];
  const result = await api.getMyBodyAssessments(session.token);
  return result.ok ? result.data : [];
}

// §5.2/§7 — the Professional's (or Admin's) formal assessment, fields in
// physical-exam order. `photos` carries up to a handful of tagged files
// (general progress + the 4 posture-screening views); each is uploaded
// before the assessment row is created, same as the self-log flow above.
export async function createFormalAssessmentAction(
  clientId: string,
  input: {
    weight: number;
    height: number;
    circumferences?: CreateFormalAssessmentInput["circumferences"];
    skinfolds?: CreateFormalAssessmentInput["skinfolds"];
    bodyFatOverride?: CreateFormalAssessmentInput["bodyFatOverride"];
    postureScreening?: CreateFormalAssessmentInput["postureScreening"];
    goal?: CreateFormalAssessmentInput["goal"];
    photos?: { tag: PhotoTagInput; file: File }[];
  },
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");

  const uploadedPhotos: { key: string; tag: PhotoTagInput }[] = [];
  for (const p of input.photos ?? []) {
    if (p.file.size === 0) continue;
    const uploaded = await uploadPhoto(session.token, clientId, p.tag, p.file);
    if (!uploaded.ok) return fail(uploaded.message);
    uploadedPhotos.push({ key: uploaded.key, tag: p.tag });
  }

  const parsed = createFormalAssessmentSchema.safeParse({
    weight: input.weight,
    height: input.height,
    circumferences: input.circumferences,
    skinfolds: input.skinfolds,
    bodyFatOverride: input.bodyFatOverride,
    postureScreening: input.postureScreening,
    goal: input.goal,
    photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
  } satisfies CreateFormalAssessmentInput);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const result = await api.createFormalAssessment(session.token, clientId, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath(`/clients`);
  return { ok: true, entry: result.data };
}

export async function getClientBodyAssessmentsAction(clientId: string) {
  const session = await requireSession();
  if (!session) return [];
  const result = await api.getClientBodyAssessments(session.token, clientId);
  return result.ok ? result.data : [];
}
