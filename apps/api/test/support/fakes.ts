import {
  Controller,
  Get,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import type { Mailer } from "../../src/auth/domain/ports/mailer.port";
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from "../../src/auth/domain/ports/google-token-verifier.port";
import { ApprovalStatusGuard } from "../../src/auth/presentation/guards/approval-status.guard";
import { Roles } from "../../src/auth/presentation/decorators/roles.decorator";
import type { MediaStore } from "../../src/exercises/domain/ports/media-store.port";
import type { SignedMediaStore } from "../../src/body-assessments/domain/ports/signed-media-store.port";
import type {
  NormalizedFoodItem,
  OpenFoodFactsClient,
  UsdaFoodDataClient,
} from "../../src/nutrition/domain/ports/food-lookup.port";

export interface SentMail {
  to: string;
  subject: string;
  text: string;
}

// PRD 15 §5.2 — external dependencies are stubbed at the Infrastructure-layer
// boundary. FakeMailer captures outbound mail instead of touching SMTP, so
// scenarios read verification/reset tokens straight out of the "sent" email
// exactly as a real user would from their inbox.
@Injectable()
export class FakeMailer implements Mailer {
  readonly sent: SentMail[] = [];

  async send(input: SentMail): Promise<void> {
    this.sent.push(input);
  }

  lastMailTo(email: string): SentMail | undefined {
    return [...this.sent].reverse().find((m) => m.to === email);
  }

  // Both transactional emails embed the raw token as a bare 64-hex string
  // ("... using this token: <hex>" / "... reset your password: <hex>").
  tokenSentTo(email: string): string {
    const mail = this.lastMailTo(email);
    const token = mail?.text.match(/([0-9a-f]{64})/)?.[1];
    if (!token) {
      throw new Error(`No token-bearing email found for ${email}`);
    }
    return token;
  }
}

// Deterministic Google verifier. Scenarios pass a fake idToken string instead
// of a real Google-issued JWT: `google:<email>:<full name>` verifies as a
// Google-owned, verified identity; `google-unverified:<email>:<name>` simulates
// a Google account whose email is not verified; anything else is invalid.
@Injectable()
export class FakeGoogleTokenVerifier implements GoogleTokenVerifier {
  async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    const [scheme, email, ...rest] = idToken.split(":");
    if (!email || rest.length === 0) {
      throw new UnauthorizedException("Invalid Google ID token");
    }
    if (scheme === "google") {
      return { email, emailVerified: true, fullName: rest.join(":") };
    }
    if (scheme === "google-unverified") {
      return { email, emailVerified: false, fullName: rest.join(":") };
    }
    throw new UnauthorizedException("Invalid Google ID token");
  }
}

// PRD 05 §5.1 — the import job re-hosts media in object storage; in tests the
// S3 boundary is faked (PRD 15 §5.2) so scenarios run without MinIO and can
// still assert that stored mediaUrl points at *our* host, not the source's.
@Injectable()
export class FakeMediaStore implements MediaStore {
  readonly puts: { key: string; bytes: Buffer; contentType: string }[] = [];

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    this.puts.push({ key, bytes: body, contentType });
    return `https://media.test/${key}`;
  }
}

// PRD 04 §5.7 — the real S3SignedMediaStore is verified live against MinIO
// separately (see checklist), the same way PRD 05's real media upload was
// verified via the CLI import rather than in jest. Here the S3 boundary is
// faked (PRD 15 §5.2) so scenarios run without MinIO while still proving
// the *shape* of the property under test: a stored `photos` entry is only
// ever `{key, tag}` (never a URL — see the Prisma repository/schema), and
// every URL a response actually contains is a distinct, mint-per-request
// "signed" string derived from the key, not a guessable static path.
@Injectable()
export class FakeSignedMediaStore implements SignedMediaStore {
  readonly uploadRequests: { key: string; contentType: string }[] = [];
  readonly downloadRequests: string[] = [];

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    this.uploadRequests.push({ key, contentType });
    return `https://signed.test/upload/${key}?ct=${encodeURIComponent(contentType)}&sig=fake-upload-sig`;
  }

  async createDownloadUrl(key: string): Promise<string> {
    this.downloadRequests.push(key);
    return `https://signed.test/download/${key}?sig=fake-download-sig-${this.downloadRequests.length}`;
  }
}

// PRD 08 §5.3 — the real Open Food Facts client is verified live against
// the real public API separately (see checklist); here the HTTP boundary is
// faked (PRD 15 §5.2) so scenarios deterministically control the `status: 0`
// "not found" case without depending on live third-party data. Barcodes are
// seeded via `seedProduct`; any other barcode resolves to "not found",
// matching the real API's behavior for an unknown/invalid code.
@Injectable()
export class FakeOpenFoodFactsClient implements OpenFoodFactsClient {
  private readonly products = new Map<string, NormalizedFoodItem>();

  seedProduct(barcode: string, item: Omit<NormalizedFoodItem, "externalId">): void {
    this.products.set(barcode, { ...item, externalId: barcode });
  }

  async lookupByBarcode(barcode: string): Promise<NormalizedFoodItem | null> {
    return this.products.get(barcode) ?? null;
  }
}

// PRD 08 §5.3 — USDA FoodData Central, faked the same way; this environment
// has no real USDA_FOODDATA_API_KEY (see checklist), so the real
// HttpUsdaFoodDataClient's live behavior with a key is not itself
// exercised, but scenarios still prove the search→normalize→cache shape
// against a controllable stand-in.
@Injectable()
export class FakeUsdaFoodDataClient implements UsdaFoodDataClient {
  private readonly results = new Map<string, NormalizedFoodItem[]>();

  seedResults(query: string, items: NormalizedFoodItem[]): void {
    this.results.set(query, items);
  }

  async search(query: string): Promise<NormalizedFoodItem[]> {
    return this.results.get(query) ?? [];
  }
}

// Test-only probe route. PRD 01 §10 requires PENDING_APPROVAL professionals to
// be blocked from Professional-only features, but the first real
// Professional-only endpoints only arrive with PRD 02/06 — so this probe
// applies the exact guard stack those endpoints will use
// (@Roles(PROFESSIONAL) + ApprovalStatusGuard) to exercise the gate today.
@Roles(Role.PROFESSIONAL)
@UseGuards(ApprovalStatusGuard)
@Controller("probe")
export class ProfessionalOnlyProbeController {
  @Get("professional-only")
  professionalOnly() {
    return { ok: true };
  }
}
