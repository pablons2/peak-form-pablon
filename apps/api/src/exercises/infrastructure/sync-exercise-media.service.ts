import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MEDIA_STORE } from "../domain/ports/media-store.port";
import type { MediaStore } from "../domain/ports/media-store.port";
import * as fs from "fs";
import * as path from "path";

interface ExternalExercise {
  id: string;
  name: string;
  body_part: string;
  muscle_group: string;
  image?: string;
  gif_url?: string;
  instruction_steps?: Record<string, string[]>;
}

@Injectable()
export class SyncExerciseMediaService {
  private readonly logger = new Logger(SyncExerciseMediaService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(MEDIA_STORE) private mediaStore: MediaStore,
  ) {}

  async syncMediaFromDataset(datasetPath: string): Promise<{
    processed: number;
    uploaded: number;
    updated: number;
    errors: number;
  }> {
    const stats = { processed: 0, uploaded: 0, updated: 0, errors: 0 };

    try {
      const exercisesPath = path.join(datasetPath, "data", "exercises.json");
      if (!fs.existsSync(exercisesPath)) {
        throw new Error(`Dataset not found at ${exercisesPath}`);
      }

      const rawData = fs.readFileSync(exercisesPath, "utf-8");
      const externalExercises: ExternalExercise[] = JSON.parse(rawData);

      this.logger.log(`Loaded ${externalExercises.length} exercises from dataset`);

      const peakformExercises = await this.prisma.exercise.findMany({
        select: { id: true, name: true, cues: true, mediaUrl: true },
      });

      this.logger.log(`Found ${peakformExercises.length} exercises in PeakForm`);

      for (const externalEx of externalExercises) {
        stats.processed++;

        try {
          const match = this.findBestMatch(externalEx.name, peakformExercises);

          if (!match) {
            this.logger.debug(`No match found for: ${externalEx.name}`);
            continue;
          }

          if (match.mediaUrl) {
            this.logger.debug(`${match.name} already has media, skipping`);
            continue;
          }

          let mediaUrl: string | null = null;

          if (externalEx.gif_url) {
            const gifPath = path.join(datasetPath, externalEx.gif_url);
            if (fs.existsSync(gifPath)) {
              mediaUrl = await this.uploadMedia(gifPath, match.id, "image/gif");
              stats.uploaded++;
            }
          } else if (externalEx.image) {
            const imagePath = path.join(datasetPath, externalEx.image);
            if (fs.existsSync(imagePath)) {
              mediaUrl = await this.uploadMedia(imagePath, match.id, "image/jpeg");
              stats.uploaded++;
            }
          }

          if (mediaUrl) {
            await this.prisma.exercise.update({
              where: { id: match.id },
              data: {
                mediaUrl,
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
    peakformExercises: Array<{ id: string; name: string; cues: string[] | null; mediaUrl: string | null }>,
  ) {
    let bestMatch = null;
    let bestScore = 0.3; // Lowered threshold for better matching

    for (const pf of peakformExercises) {
      const similarity = this.calculateSimilarity(externalName, pf.name);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = pf;
      }
    }

    if (bestMatch && bestScore > 0.4) {
      this.logger.debug(`Matched "${externalName}" to "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
    }

    return bestMatch && bestScore > 0.4 ? bestMatch : null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLen;

    return Math.max(0, similarity);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      const row: number[] = [];
      for (let j = 0; j <= n; j++) {
        if (i === 0) row.push(j);
        else if (j === 0) row.push(i);
        else row.push(0);
      }
      dp.push(row);
    }

    for (let i = 1; i <= m; i++) {
      const row = dp[i];
      if (!row) continue;
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          row[j] = dp[i - 1]![j - 1]!;
        } else {
          row[j] = 1 + Math.min(dp[i - 1]![j]!, row[j - 1]!, dp[i - 1]![j - 1]!);
        }
      }
    }

    return dp[m]![n]!;
  }

  private async uploadMedia(filePath: string, exerciseId: string, contentType: string): Promise<string> {
    const ext = contentType === "image/gif" ? ".gif" : ".jpg";
    const key = `exercises/${exerciseId}${ext}`;

    const fileContent = fs.readFileSync(filePath);

    return await this.mediaStore.put(key, fileContent, contentType);
  }
}
