import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Global: every feature module needs DB access; re-importing PrismaModule
// everywhere would be pure boilerplate (base doc §7.2's Infrastructure layer
// is still respected — this is the one shared low-level client, feature
// modules still go through their own repository abstractions on top of it).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
