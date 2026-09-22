"use client";

// PRD 09 §2/§7 — both views load in one server-side round trip (§7's
// "single aggregating API call"); this just toggles which one is visible,
// no extra fetch on switch. A real tablist (not two buttons styled to
// look like one) so it's keyboard/AT-navigable per product spec.
import { useState, type ReactNode } from "react";

export function DashboardTabs({
  today,
  week,
}: {
  today: ReactNode;
  week: ReactNode;
}) {
  const [tab, setTab] = useState<"today" | "week">("today");

  return (
    <div>
      <div role="tablist" aria-label="Períodos" className="flex gap-1 rounded-lg bg-muted p-1">
        <TabButton label="Hoje" selected={tab === "today"} onClick={() => setTab("today")} />
        <TabButton label="Esta semana" selected={tab === "week"} onClick={() => setTab("week")} />
      </div>
      <div className="mt-4" role="tabpanel">
        {tab === "today" ? today : week}
      </div>
    </div>
  );
}

function TabButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-md px-3 text-sm font-medium ${
        selected
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
