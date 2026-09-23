import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { UserDirectory } from "../domain/ports/user-directory.port";

// See the port's comment for why this reads the users table directly
// instead of going through AuthModule (AuthModule imports THIS module —
// the reverse edge would be a Nest module cycle).
@Injectable()
export class PrismaUserDirectory implements UserDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async findContact(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });
  }

  async findDisplayName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    return user?.fullName ?? null;
  }
}
