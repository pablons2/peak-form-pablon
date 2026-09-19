import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UserWithProfiles } from "../../domain/ports/user.repository.port";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserWithProfiles => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
