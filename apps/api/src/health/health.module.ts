import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

// Infra-only module, no business logic — exists so PRD 14 §5.5's `make up`
// can poll a real endpoint before declaring the stack "ready", and so
// Compose healthchecks have something to hit.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
