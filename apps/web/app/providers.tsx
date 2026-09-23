"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "@peakform/ui";

// Client-side providers: NextAuth session (useSession/signOut), TanStack
// Query for server state, and next-themes for the .dark class toggle
// globals.css already fully supports (docs/redesign-plan.md §3.5/§5.1).
// QueryClient is created per-app-instance in state so it isn't shared across
// requests on the server.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
