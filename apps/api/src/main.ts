import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // base doc §9 — standard hardening: Helmet headers, cookie parsing (the
  // refresh token travels as an httpOnly cookie), CORS locked to the known
  // web origin with credentials allowed (required for that cookie to work
  // cross-origin between apps/web and apps/api).
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_BASE_URL ?? "http://localhost:3000",
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
