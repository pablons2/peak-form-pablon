import { Injectable, Logger } from "@nestjs/common";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { MediaStore } from "../domain/ports/media-store.port";

// S3-compatible object storage (base doc §7.6): MinIO in dev (docker-compose),
// AWS S3 / Cloudflare R2 in production — the SDK covers all three. The bucket
// is created on first use and set public-read, so stored URLs render directly
// in the browser (exercise GIFs are public catalog content — nothing
// user-private lives here; private media like PRD 04 progress photos get
// signed URLs instead).
@Injectable()
export class S3MediaStore implements MediaStore {
  private readonly logger = new Logger(S3MediaStore.name);
  private readonly client: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? "peakform-media";
  // S3_ENDPOINT is where *this process* reaches the store (minio:9000 inside
  // compose); S3_PUBLIC_URL is the host browsers resolve (localhost:9000 in
  // dev). Defaults keep a bare local setup working.
  private readonly publicBase =
    process.env.S3_PUBLIC_URL ??
    process.env.S3_ENDPOINT ??
    "http://localhost:9000";
  private bucketReady = false;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "peakform_minio",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "peakform_minio_secret",
      },
      forcePathStyle: true,
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Catalog media is immutable content — re-imports re-put the same key
        // only when the source bytes changed (import skips unchanged entries).
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${this.publicBase}/${this.bucket}/${key}`;
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      this.logger.log(`Creating media bucket "${this.bucket}"`);
      await this.client.send(
        new CreateBucketCommand({ Bucket: this.bucket }),
      );
    }
    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      }),
    );
    this.bucketReady = true;
  }
}
