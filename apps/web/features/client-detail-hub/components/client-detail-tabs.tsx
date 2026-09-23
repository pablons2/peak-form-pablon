"use client";

import { useState, type ReactNode } from "react";

export type ClientDetailTab = "overview" | "treino" | "nutricao" | "avaliacoes" | "mensagens";

export function ClientDetailTabs({
  overview,
  treino,
  nutricao,
  avaliacoes,
  mensagens,
}: {
  overview: ReactNode;
  treino: ReactNode;
  nutricao: ReactNode;
  avaliacoes: ReactNode;
  mensagens: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("overview");

  const tabs: Array<{ id: ClientDetailTab; label: string }> = [
    { id: "overview", label: "Visão Geral" },
    { id: "treino", label: "Treino" },
    { id: "nutricao", label: "Nutrição" },
    { id: "avaliacoes", label: "Avaliações" },
    { id: "mensagens", label: "Mensagens" },
  ];

  const content: Record<ClientDetailTab, ReactNode> = {
    overview,
    treino,
    nutricao,
    avaliacoes,
    mensagens,
  };

  return (
    <div>
      <div role="tablist" aria-label="Seções do cliente" className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
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
