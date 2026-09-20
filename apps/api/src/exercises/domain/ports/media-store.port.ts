export const MEDIA_STORE = Symbol("MEDIA_STORE");

/// Own object storage (base doc §7.6 — S3-compatible). Exercise media is
/// re-hosted here at import time so the app never depends on the source
/// dataset's hosting at runtime (PRD 05 §5.1/§3).
export interface MediaStore {
  /// Store bytes under key and return the public URL the web app renders.
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}
