import { Inject, Injectable } from "@nestjs/common";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

@Injectable()
export class ListPendingProfessionalsUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute() {
    return this.users.listPendingProfessionals();
  }
}
