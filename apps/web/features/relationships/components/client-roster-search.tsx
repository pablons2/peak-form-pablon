"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

export function ClientRosterSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  function handleSearch(value: string) {
    setSearchValue(value);
    startTransition(() => {
      if (value) {
        router.push(`?search=${encodeURIComponent(value)}`);
      } else {
        router.push(`?`);
      }
    });
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        disabled={isPending}
        className="w-full pl-9 pr-8 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {searchValue && (
        <button
          onClick={() => handleSearch("")}
          disabled={isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground disabled:opacity-60"
          title="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
