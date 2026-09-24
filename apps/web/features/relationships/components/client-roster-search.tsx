"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

// Filters the roster server-side via the ?search= param. Debounced so typing
// doesn't fire a full server round trip per keystroke; ?selected= is preserved
// so the detail pane stays open while filtering.
export function ClientRosterSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    const committed = searchParams.get("search") ?? "";
    if (searchValue === committed) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (searchValue) {
          params.set("search", searchValue);
        } else {
          params.delete("search");
        }
        const qs = params.toString();
        router.push(qs ? `?${qs}` : "?");
      });
    }, 300);
    return () => clearTimeout(timer);
    // searchParams is intentionally not a dependency: re-running on every
    // server navigation would reset the debounce mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar cliente..."
        aria-label="Buscar cliente por nome ou especialização"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {searchValue && (
        <button
          type="button"
          onClick={() => setSearchValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          title="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isPending && (
        <p aria-live="polite" className="sr-only">
          Buscando...
        </p>
      )}
    </div>
  );
}
