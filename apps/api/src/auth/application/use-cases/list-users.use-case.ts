import { Inject, Injectable } from "@nestjs/common";
import {
  USER_REPOSITORY,
  type UserListFilters,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 13 §5.1 — Admin's user list/search across every role and status.
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(filters: UserListFilters) {
    return this.users.listAll(filters);
  }
}
