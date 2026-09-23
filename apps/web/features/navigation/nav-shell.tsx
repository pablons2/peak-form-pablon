"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Badge, Button, InitialsAvatar } from "@peakform/ui";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NAV_ITEM_LABELS } from "./labels";
import { getNavItems, type NavItemKey, type Role } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle({ className }: { className?: string }) {
  // next-themes only knows the resolved theme after mount (it reads
  // localStorage/media query client-side) — render a stable icon until then
  // to avoid a hydration mismatch.
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={NAV_ITEM_LABELS.theme}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

interface NavShellProps {
  role: Role;
  badges: Partial<Record<NavItemKey, number>>;
  name: string | null | undefined;
  children: React.ReactNode;
}

export function NavShell({ role, badges, name, children }: NavShellProps) {
  const pathname = usePathname();
  // Icons are component references (functions) — they can't cross the
  // server/client boundary as props (RSC only serializes plain data), so the
  // client-side NavShell resolves the role's nav items itself rather than
  // receiving them from the (app) layout server component.
  const items = getNavItems(role);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground">PeakForm</span>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
          {items.map(({ key, href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </span>
                {badges[key] ? <Badge variant="warning">{badges[key]}</Badge> : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <InitialsAvatar name={name ?? "?"} />
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card lg:hidden"
      >
        {items.map(({ key, href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
              {badges[key] ? (
                <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-warning" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <main className="pb-16 lg:pb-0 lg:pl-64">{children}</main>
    </div>
  );
}
