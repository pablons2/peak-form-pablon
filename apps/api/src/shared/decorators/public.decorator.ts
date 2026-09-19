import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// Opts a route out of the global JwtAuthGuard (signup/login/verify/refresh/
// password-reset, health checks — base doc §9 still applies everywhere
// else by default, this is an explicit, visible exception per route, not a
// missing guard). Lives in shared/, not auth/, since infra routes like
// HealthController need it without depending on the auth feature module.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
