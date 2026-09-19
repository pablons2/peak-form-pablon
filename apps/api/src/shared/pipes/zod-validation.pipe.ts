import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

// Presentation-layer adapter around packages/validation's zod schemas (base
// doc §7.1/§9 — this IS the security boundary; the frontend's copy of the
// same schema is UX only).
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
