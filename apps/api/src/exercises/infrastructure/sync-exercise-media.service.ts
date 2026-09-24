import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { S3Service } from "@/storage/s3.service";
import * as fs from "fs";
import * as path from "path";
import levenshtein from "js-levenshtein";

interface ExternalExercise {
  id: string;
  name: string;
  body_part: string;
  muscle_group: string;
  image: string;
  gif_url: string;
  media_id: string;
  instruction_steps?: Record<string, string[]>;
}

@Injectable()
export class SyncExerciseMediaService {
  private readonly logger = new Logger(SyncExerciseMediaService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async syncMediaFromDataset(datasetPath: string): Promise<{
    processed: number;
    uploaded: number;
    updated: number;
    errors: number;
  }> {
    const stats = { processed: 0, uploaded: 0, updated: 0, errors: 0 };

    try {
      // Ler arquivo de exercícios do dataset
      const exercisesPath = path.join(datasetPath, "data", "exercises.json");
      if (!fs.existsSync(exercisesPath)) {
        throw new Error(`Dataset not found at ${exercisesPath}`);
      }

      const rawData = fs.readFileSync(exercisesPath, "utf-8");
      const externalExercises: ExternalExercise[] = JSON.parse(rawData);

      this.logger.log(`Loaded ${externalExercises.length} exercises from dataset`);

      // Carregar todos os exercícios do PeakForm
      const peakformExercises = await this.prisma.exercise.findMany({
        select: { id: true, name: true, cues: true, mistakes: true, mediaUrl: true },
      });

      this.logger.log(`Found ${peakformExercises.length} exercises in PeakForm`);

      // Para cada exercício externo, encontrar match no PeakForm
      for (const externalEx of externalExercises) {
        stats.processed++;

        try {
          const match = this.findBestMatch(externalEx.name, peakformExercises);

          if (!match) {
            this.logger.debug(`No match found for: ${externalEx.name}`);
            continue;
          }

          // Se já tem mídia, pular
          if (match.mediaUrl) {
            this.logger.debug(`${match.name} already has media, skipping`);
            continue;
          }

          // Upload da imagem
          let mediaUrl: string | null = null;

          if (externalEx.gif_url && fs.existsSync(path.join(datasetPath, externalEx.gif_url))) {
            mediaUrl = await this.uploadMedia(
              path.join(datasetPath, externalEx.gif_url),
              externalEx.media_id,
              "gif",
            );
            stats.uploaded++;
          } else if (externalEx.image && fs.existsSync(path.join(datasetPath, externalEx.image))) {
            mediaUrl = await this.uploadMedia(
              path.join(datasetPath, externalEx.image),
              externalEx.media_id,
              "image",
            );
            stats.uploaded++;
          }

          // Atualizar exercício com a URL
          if (mediaUrl) {
            await this.prisma.exercise.update({
              where: { id: match.id },
              data: {
                mediaUrl,
                // Adicionar cues e mistakes do dataset se não tiver
                ...((!match.cues || match.cues.length === 0) &&
                  externalEx.instruction_steps?.en && {
                    cues: externalEx.instruction_steps.en,
                  }),
              },
            });

            stats.updated++;
            this.logger.log(`Updated: ${match.name} with media`);
          }
        } catch (error) {
          stats.errors++;
          this.logger.error(`Error processing ${externalEx.name}:`, error);
        }
      }

      this.logger.log(`Sync complete: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error("Sync failed:", error);
      throw error;
    }
  }

  private findBestMatch(
    externalName: string,
    peakformExercises: Array<{ id: string; name: string; cues: string[]; mistakes: string[]; mediaUrl: string | null }>,
  ) {
    let bestMatch = null;
    let bestScore = 0.5; // Threshold mínimo

    for (const pf of peakformExercises) {
      const similarity = this.calculateSimilarity(externalName, pf.name);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = pf;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Verificação exata
    if (s1 === s2) return 1;

    // Verificação parcial
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Levenshtein distance
    const distance = levenshtein(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLen;

    return Math.max(0, similarity);
  }

  private async uploadMedia(filePath: string, mediaId: string, type: "image" | "gif"): Promise<string> {
    const ext = type === "gif" ? ".gif" : ".jpg";
    const key = `exercises/${mediaId}${ext}`;

    const fileContent = fs.readFileSync(filePath);
    const contentType = type === "gif" ? "image/gif" : "image/jpeg";

    await this.s3.putObject({
      Bucket: process.env.S3_BUCKET || "peakform",
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    // Retornar URL pública (ajustar conforme seu setup MinIO)
    const s3Url = process.env.S3_PUBLIC_URL || "http://minio:9000";
    return `${s3Url}/${process.env.S3_BUCKET || "peakform"}/${key}`;
  }
}
