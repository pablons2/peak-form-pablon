import { Module } from "@nestjs/common";
import { DOMAIN_EVENT_BUS } from "./domain-events/domain-event-bus.port";
import { InProcessEventBus } from "./domain-events/in-process-event-bus";
import { AuditLogService } from "./audit-log/audit-log.service";

@Module({
  providers: [
    AuditLogService,
    { provide: DOMAIN_EVENT_BUS, useClass: InProcessEventBus },
  ],
  exports: [AuditLogService, DOMAIN_EVENT_BUS],
})
export class SharedModule {}
