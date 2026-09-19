"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Sair
    </button>
  );
}
