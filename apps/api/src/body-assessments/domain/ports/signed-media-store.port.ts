export const SIGNED_MEDIA_STORE = Symbol("SIGNED_MEDIA_STORE");

/// Private, signed-URL-only object storage (PRD 04 §5.7 / base doc §7.6).
/// Unlike PRD 05's `MediaStore` (public-read, exercise catalog media), this
/// bucket is never given a public-read policy — progress/posture photos are
/// sensitive by nature (§5.7). A stored `BodyAssessment.photos` entry is
/// always just the object key; every URL handed to a client is short-lived
/// and minted on demand by this port.
export interface SignedMediaStore {
  /// Presigned PUT URL the browser uploads bytes to directly, valid briefly
  /// (an upload that doesn't happen promptly must be re-requested).
  createUploadUrl(key: string, contentType: string): Promise<string>;
  /// Presigned GET URL for reading one object back, valid briefly — minted
  /// fresh every time a BodyAssessment is serialized, never cached in the DB.
  createDownloadUrl(key: string): Promise<string>;
}
