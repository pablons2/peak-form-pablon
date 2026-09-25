"use client";

// PRD 08 §7 — the Nutritionist's acompanhamento panel tab switcher. Same
// role="tablist"/role="tab" button pattern as client-detail-tabs.tsx (the
// proven pattern) — server-rendered content comes in as ReactNode props,
// so the data fetching stays in the server component above.
import { useState, type ReactNode } from "react";

export type NutritionPanelTab = "hoje" | "dieta" | "adherencia" | "historico";

export function NutritionPanelTabs({
  hoje,
  dieta,
  adherencia,
  historico,
}: {
  hoje: ReactNode;
  dieta: ReactNode;
  adherencia: ReactNode;
  historico: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<NutritionPanelTab>("hoje");

  const tabs: Array<{ id: NutritionPanelTab; label: string }> = [
    { id: "hoje", label: "Hoje" },
    { id: "dieta", label: "Dieta" },
    { id: "adherencia", label: "Aderência" },
    { id: "historico", label: "Histórico" },
  ];

  const content: Record<NutritionPanelTab, ReactNode> = {
    hoje,
    dieta,
    adherencia,
    historico,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Seções de nutrição do cliente"
        className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 whitespace-nowrap rounded-md px-3 text-sm font-medium ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {content[activeTab]}
      </div>
    </div>
  );
}
