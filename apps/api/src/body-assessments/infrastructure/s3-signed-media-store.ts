import { Injectable, Logger } from "@nestjs/common";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SignedMediaStore } from "../domain/ports/signed-media-store.port";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

// S3-compatible object storage (base doc §7.6), same MinIO/S3/R2 target as
// PRD 05's S3MediaStore — but a *separate, private* bucket: this one never
// gets a public-read bucket policy (PRD 04 §5.7 — progress/posture photos
// are sensitive, unlike exercise catalog media). Every URL handed out is a
// short-lived presigned PUT (upload) or GET (read), never a stored/cached
// permanent link.
@Injectable()
export class S3SignedMediaStore implements SignedMediaStore {
  private readonly logger = new Logger(S3SignedMediaStore.name);
  // Two clients, same credentials, different endpoints — same split
  // S3MediaStore uses (S3_ENDPOINT vs S3_PUBLIC_URL): `client` talks to the
  // compose-internal host (minio:9000) for real network calls (bucket
  // create/check). `presignClient` is configured with the *browser-facing*
  // host instead — a presigned URL is pure local HMAC computation (no
  // network round-trip), but the request's signed Host header must already
  // be the host whoever follows the URL will actually hit, or the signature
  // won't validate. Using `client`'s internal endpoint here would silently
  // hand the browser an unreachable `minio:9000` URL (caught live while
  // verifying this module — see checklist).
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket = process.env.S3_PHOTOS_BUCKET ?? "peakform-photos";
  private bucketReady = false;

  constructor() {
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "peakform_minio",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "peakform_minio_secret",
    };
    const region = process.env.S3_REGION ?? "us-east-1";
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region,
      credentials,
      forcePathStyle: true,
    });
    this.presignClient = new S3Client({
      endpoint:
        process.env.S3_PUBLIC_URL ??
        process.env.S3_ENDPOINT ??
        "http://localhost:9000",
      region,
      credentials,
      forcePathStyle: true,
    });
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    await this.ensureBucket();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.presignClient, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
  }

  async createDownloadUrl(key: string): Promise<string> {
    await this.ensureBucket();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.presignClient, command, {
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    });
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      this.logger.log(`Creating private photo bucket "${this.bucket}"`);
      await this.client.send(
        new CreateBucketCommand({ Bucket: this.bucket }),
      );
    }
    // Deliberately no PutBucketPolicyCommand here (contrast with
    // S3MediaStore) — MinIO/S3 buckets default to private, and this bucket
    // must stay that way: every read goes through createDownloadUrl's
    // presigned GET, never a bare `${endpoint}/${bucket}/${key}` URL.
    this.bucketReady = true;
  }
}
