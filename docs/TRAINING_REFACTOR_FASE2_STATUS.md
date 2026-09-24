# Fase 2 — Componentes Unificados (`TrainingPlanCard`) — STATUS

**Data:** 2026-09-23
**Status:** ✅ **IMPLEMENTADO**
**Tempo Estimado:** 1.5 dias

---

## ✅ O Que Foi Feito

### 2.1 ✅ Componente `TrainingPlanCard` Criado

**Arquivo:** `apps/web/features/training-plans/components/training-plan-card.tsx`

Card único que representa um plano de treino em todo o app:

- ✅ Nome do plano (link para `/plans/[id]`)
- ✅ Status badge colorido (`TRAINING_PLAN_STATUS_BADGE_CLASS`)
- ✅ Data de início formatada PT-BR ("Início: 24 de set de 2026")
- ✅ Próxima sessão (opcional): "hoje" ou data curta + nº de exercícios
- ✅ CTA: "Ver treino →" (cliente) / "Abrir plano →" (`isEditable`, profissional)
- ✅ Renderiza como `<li>` — os consumidores mantêm `<ul>` semântica

**Props:**

```typescript
{
  plan: PublicTrainingPlan;
  nextSession?: PublicSession | null;
  isEditable?: boolean; // default false
}
```

**Suporte em `features/training-plans/labels.ts`:**

- ✅ `TRAINING_PLAN_STATUS_BADGE_CLASS` — DRAFT=warning, ACTIVE=success, COMPLETED/ARCHIVED=muted (mesma convenção de `SESSION_STATUS_BADGE_CLASS`)
- ✅ `formatPlanStartDate()` — data PT-BR pinned em UTC (mesmo padrão de `formatDayMonth` em `features/dashboard/labels.ts`)
- ✅ `formatSessionDate()` — "hoje" (timezone America/Sao_Paulo) ou data curta

### 2.2 ✅ `/plans/page.tsx` (Cliente) Refatorado

- ✅ `<li>` manual substituído por `TrainingPlanCard`
- ✅ Empty state claro: mensagem + CTA para modelos iniciais (`/plans/starter-templates`)
- ✅ Sem `nextSession` (o endpoint `GET /training-plans/mine` não retorna sessões — gap de backend, não contornado no frontend)

### 2.3 ✅ `TrainingPlansTab` (Profissional) Refatorado

- ✅ Usa `TrainingPlanCard` com `isEditable`
- ✅ Import de `AlertCircle` removido (não utilizado)
- ✅ Aviso de triagem (intake) e CTA "Criar plano" preservados

### 2.4 ✅ `TodayTrainingCard` Verificado

- ✅ Já segue o padrão unificado (mesmo card shell + `SESSION_STATUS_BADGE_CLASS`)
- ✅ Nenhuma mudança necessária — foco do card é a sessão de hoje, não o plano

### 2.5 ✅ Verificação

- ✅ `tsc --noEmit`: sem erros novos (3 erros pré-existentes em arquivos não tocados: `sessions/[id]/edit/page.tsx`, `packages/ui/use-toast.ts`)
- ✅ ESLint: sem warnings/erros nos arquivos modificados
- ⚠️ `next build` bloqueado por ambiente: `apps/web/.next/types` é root-owned (de um run de container). Fix: `sudo rm -rf apps/web/.next/types`

---

## 🎨 Visual do Componente

```
┌─────────────────────────────────────┐
│ plano A                  [Ativo]    │
│ Início: 24 de set de 2026           │
│ Próxima sessão: hoje — 5 exercício(s)│
│ Ver treino →                        │
└─────────────────────────────────────┘
```

---

## 📝 Decisões

1. **`<li>` dentro do componente**: consumidores usam `<ul>`; mantém HTML semântico sem duplicar classes.
2. **Sem rota de edição dedicada**: não existe `/plans/[id]/edit`; `isEditable` só muda o label do CTA para o detail page `/plans/[id]`, onde ficam as ações de gestão.
3. **Badge classes em `labels.ts`**: segue a convenção de um arquivo de labels por módulo (mesmo padrão de `client-training-execution/labels.ts`).
4. **Fuso**: datas de calendário lidas em UTC; "hoje" resolvido em America/Sao_Paulo (mesmo padrão de `habits/today-checklist.tsx`).

---

## 🔧 Arquivos Modificados

- ✅ `apps/web/features/training-plans/components/training-plan-card.tsx` (novo)
- ✅ `apps/web/features/training-plans/labels.ts` (badge classes + formatadores)
- ✅ `apps/web/app/(app)/plans/page.tsx` (refatorado)
- ✅ `apps/web/features/client-detail-hub/components/training-plans-tab.tsx` (refatorado)
- ✅ `apps/web/features/dashboard/components/training-assignment-card.tsx` (fix de tipos da Fase 1: `PublicSessionExecution` + guard de `activePlan`)

---

## 🚀 Próximos Passos

- **Fase 3:** Responsividade (/today, /plans, /dashboard) — revisar layouts mobile-first
- **Fase 4:** Notificação (backend) — evento `training-plan.created`, e-mail, in-app
- **Gap de backend a flagar:** `GET /training-plans/mine` não retorna próxima sessão por plano; o card aceita `nextSession` mas nenhum caller consegue preencher hoje.

---

## ✅ Status Final Fase 2

- **Implementação:** ✅ 100% completa
- **Typecheck:** ✅ (sem erros novos)
- **Lint:** ✅
- **Build:** ⚠️ bloqueado por permissão root em `.next/types` (ambiental)
- **Teste manual no navegador:** ⏳ pendente (Fase 3 / QA)
