export const USER_DIRECTORY = Symbol("USER_DIRECTORY");

/// The minimal contact-lookup the dispatcher needs — a recipient's email
/// address, and display names when a notification's text names the other
/// party ("Nova mensagem de X"). Deliberately NOT auth's UserRepository:
/// NotificationsModule must stay dependency-free of AuthModule because
/// AuthModule imports this module for the account-security send path
/// (§5.1) — a cycle would need forwardRef gymnastics. A tiny two-method
/// read port over the users table is the smaller seam.
export interface UserDirectory {
  findContact(
    userId: string,
  ): Promise<{ id: string; email: string; fullName: string } | null>;
  findDisplayName(userId: string): Promise<string | null>;
}
