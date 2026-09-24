"use client";

import { useState, type ReactNode } from "react";

export type ClientDetailTab = "overview" | "treino" | "execucao" | "nutricao" | "avaliacoes" | "mensagens";

export function ClientDetailTabs({
  overview,
  treino,
  execucao,
  execucaoCount,
  nutricao,
  avaliacoes,
  mensagens,
}: {
  overview: ReactNode;
  treino: ReactNode;
  execucao?: ReactNode;
  /** Session count shown next to the "Execução" label (e.g. "2 sessões"). */
  execucaoCount?: number;
  nutricao: ReactNode;
  avaliacoes: ReactNode;
  mensagens: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("overview");

  const execucaoLabel = execucao
    ? `Execução (${execucaoCount ?? 0} ${execucaoCount === 1 ? "sessão" : "sessões"})`
    : null;

  const tabs: Array<{ id: ClientDetailTab; label: string }> = [
    { id: "overview", label: "Visão Geral" },
    { id: "treino", label: "Treino" },
    ...(execucao ? [{ id: "execucao" as const, label: execucaoLabel! }] : []),
    { id: "nutricao", label: "Nutrição" },
    { id: "avaliacoes", label: "Avaliações" },
    { id: "mensagens", label: "Mensagens" },
  ];

  const content: Record<ClientDetailTab, ReactNode> = {
    overview,
    treino,
    execucao: execucao || null,
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
