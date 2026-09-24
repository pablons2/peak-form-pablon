# 📊 Training Refactor — Visual Summary & Diagrams

---

## 1. O Problema (Antes)

```
PROFISSIONAL                          CLIENTE
─────────────────                     ─────────

    /clients                              /dashboard
       ↓ seleciona                           ↓ login
       │ client2                            │ "Olá!"
       ↓                                    │
    /plans/new                         ❌ Nenhum plano?
       ↓ cria treino
       │ "Musculação"
       │ data: 2026-09-24
       │ sessões: 12
       ↓ SALVA
       │ ✅ Sucesso!
       │
       └────────────────── NÃO HÁ CONEXÃO ──────────────────┐
                                                            ↓
                                                        /plans
                                                        ❌ "Sem plano"
                                                        (confusão!)
```

**Resultado:** Profissional investe tempo criando plano que cliente não consegue ver.

---

## 2. A Solução (Depois) — Fluxo Completo

```
PROFISSIONAL                  SISTEMA                       CLIENTE
────────────────────         ──────────                    ─────────

/clients
   ↓ seleciona client2
   │
/plans/new
   ↓ cria "Musculação"
   │ data: 2026-09-24
   │ salva
   │
   └─→ POST /training-plans
       ├─ Valida intake ✓
       ├─ Cria TrainingPlan
       ├─ Gera Sessions (12)
       └─ EMIT: training-plan.created
          │
          ├─→ SEND EMAIL ────────────────────→ client@email.com
          │   "Novo plano atribuído"          ✉️ Email recebido
          │
          └─→ CREATE Notification ────────→ /dashboard
              type: TRAINING_PLAN_CREATED   🔔 Badge (1)
              read: false
              link: /plans
              │
              ├─→ WebSocket (client online)
              │   └─→ Badge atualiza REAL-TIME
              │
              └─→ DB INSERT
                  
                                            
                                            /dashboard
                                               ↓ vê NOVO
                                            "Você tem 1 plano"
                                            "Próxima: hoje 10h"
                                            [CTA: Ver treinos]
                                               ↓ clica
                                            /plans
                                               ↓ vê
                                            "Musculação" (ACTIVE)
                                            "Início: 24 set"
                                            "Próxima: hoje 10h"
                                            [CTA: Ver sessão]
                                               ↓ clica
                                            /today
                                               ↓ vê
                                            Exercícios de hoje
                                            Log de sets
                                            ✅ Executa
                                            
                                            
/clients/[linkId]
   ↓ vê dashboard profissional
   ├─ "client2" com 1 plano ACTIVE
   │ "Próxima sessão: hoje"
   │ "Aderência: 0% (novo)"
   │
   └─→ /clients/[linkId]/training-execution
       ↓ vê
       ├─ Sessão de hoje
       ├─ Performance do cliente
       ├─ Exercícios vs alvo (detalhe)
       └─ Trending de performance
```

---

## 3. Arquitetura de Componentes (Antes vs Depois)

### ANTES ❌ — Fragmentado

```
/dashboard
├─ TodayTrainingCard (desorganizado)
│  └─ Estilo 1: simples <li>
│
/plans
├─ Lista com <li> crua
│  └─ Estilo 2: sem destaque
│
/clients/[linkId]
├─ TrainingPlansTab
   └─ Estilo 3: diferente novamente

❌ 3 estilos diferentes
❌ Sem componente reutilizável
❌ Difícil manter, inconsistente
```

### DEPOIS ✅ — Unificado

```
features/training-plans/components/
├─ TrainingPlanCard ..................... COMPONENTE REUTILIZÁVEL
│  ├─ Props: plan, nextSession, isEditable
│  ├─ Render: status badge, nome, data, próxima sessão
│  ├─ Estilos: consistente (Card + Badge + Button)
│  └─ Responsivo: mobile-first
│
└─ Usado em:
   ├─ /dashboard (via TrainingAssignmentCard) ✅
   ├─ /plans (cliente) ✅
   ├─ /clients/[linkId] (profissional) ✅
   └─ /today (sessão de hoje) ✅

✅ 1 componente, 4 contextos
✅ Fácil manter, consistente
✅ Reutilizável, escalável
```

---

## 4. Fluxo de Estados (Cliente)

```
┌─────────────────────────────────────────────────────────┐
│ CLIENTE DESCOBRE PLANO (3 toques)                       │
└─────────────────────────────────────────────────────────┘

1️⃣  LOGIN
    ↓
    /dashboard
    ├─ Vê card: "Novo plano: Musculação"  ← DISCOVERY
    ├─ Status badge: "ACTIVE"
    ├─ CTA: "[Ver meus treinos]"
    ↓

2️⃣  CLICA CTA
    ↓
    /plans
    ├─ Lista planos (1+)
    ├─ Card: "Musculação"
    │  ├─ Início: 24 set
    │  ├─ Próxima sessão: hoje 10h
    │  └─ [Ver treino →]
    ↓

3️⃣  CLICA "Ver treino"
    ↓
    /today
    ├─ Sessão de hoje
    │  ├─ Exercícios: 5
    │  ├─ Duração estimada: 45 min
    │  └─ [Iniciar treino]
    └─ Histórico abaixo
```

---

## 5. Diagrama de Notificação (Backend Event-Driven)

```
┌──────────────────────────────────────────────────────────┐
│ POST /training-plans (profissional cria plano)           │
└──────────────────────────────────────────────────────────┘
  │
  ├─→ NestJS Controller
  │   ├─ Validar: cliente intake COMPLETED ✓
  │   ├─ Criar: TrainingPlan row
  │   ├─ Gerar: Session rows (mesocycles)
  │   └─ EMIT: EventEmitter.emit('training-plan.created', {...})
  │      │
  │      └─→ EVENT: training-plan.created
  │          │
  │          ├─→ Handler 1: EMAIL
  │          │   ├─ Template: "Novo plano atribuído"
  │          │   ├─ To: client.email
  │          │   ├─ Link: app.com/plans
  │          │   └─ Via: MailerService
  │          │       → MailHog (dev) / Sendgrid (prod)
  │          │
  │          ├─→ Handler 2: NOTIFICATION
  │          │   ├─ INSERT Notification
  │          │   │  (userId, type, title, message, link, read)
  │          │   ├─ read: false (novo)
  │          │   ├─ link: /plans
  │          │   └─ createdAt: now
  │          │
  │          └─→ Handler 3: WEBSOCKET (optional)
  │              ├─ Se cliente online: emit update
  │              └─ Badge no nav se conectado
  │
  └─→ Response: 201 Created
      {"id": "plan-123", "status": "ACTIVE"}


┌──────────────────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                       │
└──────────────────────────────────────────────────────────┘
  │
  ├─→ Login / Dashboard load
  │   └─ GET /notifications
  │      ├─ Response: [{ id, type, title, message, link, read }]
  │      ├─ Unread count: 1
  │      └─ Render badge: 🔔 (1)
  │
  ├─→ Clica badge 🔔
  │   └─ Navigate → /notifications
  │      └─ Vê: "Novo plano: Musculação"
  │         └─ Clica → /plans
  │            └─ Marca notificação read
  │
  └─→ Ou clica CTA no dashboard
      └─ Navigate → /plans
         └─ Vê plano novo + botões de ação
```

---

## 6. Timeline Visual (Gantt Chart Style)

```
2026-09-23 (Hoje)
  ├─ Fase 0: DIAGNÓSTICO ███░░░░░░░░░░░░░░░░░░░░░░░░░░ 2-4h
  │  └─ DB check, API test, relatório
  │
2026-09-24
  ├─ Fase 1: DISCOVERY CARD ████████░░░░░░░░░░░░░░░░░░░░ 1 dia
  │  └─ TrainingAssignmentCard no dashboard
  │
  ├─ Fase 2: COMPONENTES ██████████░░░░░░░░░░░░░░░░░░░░░ 1.5 dias
  │  └─ TrainingPlanCard reutilizável
  │
  └─ Fase 3: RESPONSIVIDADE ████████░░░░░░░░░░░░░░░░░░░░ 1.5 dias
     └─ Mobile + desktop (parallelizável)
  │
2026-09-27
  ├─ Fase 4: NOTIFICAÇÃO ███████████░░░░░░░░░░░░░░░░░░░░ 2 dias
  │  └─ Event + email + in-app notification
  │
2026-09-28
  ├─ Fase 5: VALIDAÇÃO ████████░░░░░░░░░░░░░░░░░░░░░░░░ 1 dia
  │  └─ E2E, performance, acessibilidade
  │
  └─ 🚀 DEPLOY PRODUÇÃO
  │
2026-10-01
  └─ Fase 6: MONITORIA ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Ongoing
     └─ Analytics, feedback, v2 roadmap
```

---

## 7. Component Hierarchy (Depois)

```
<App>
├─ <RootLayout>
│  ├─ <NavigationShell>
│  │  └─ Badge (notifications count)
│  │
│  └─ <Dashboard> (Cliente)
│     ├─ <TrainingAssignmentCard> ← NEW
│     │  ├─ Chama: listMyTrainingPlans()
│     │  └─ Props: plans[], today?
│     │
│     └─ [Outras cards: Nutrition, Messages, etc]
│
├─ <PlansPage> (Cliente)
│  └─ <TrainingPlanCard> (reutilizável)
│     ├─ Chama: listMyTrainingPlans()
│     └─ Map: plans.map(plan => <TrainingPlanCard>)
│
├─ <TodayPage> (Cliente)
│  ├─ <TodaySessionView>
│  │  ├─ Chama: getTodaySession()
│  │  └─ Mostra: exercícios + log
│  │
│  └─ <SessionHistoryList>
│     └─ Mostra: últimas sessões
│
├─ <ClientsPage> (Profissional)
│  ├─ <ClientRosterRow>[] (lado esquerdo)
│  │
│  └─ <ClientDetailPanel> (lado direito)
│     ├─ <ClientDetailTabs>
│     │  ├─ <OverviewTab>
│     │  ├─ <TrainingPlansTab>
│     │  │  └─ <TrainingPlanCard> (reutilizável)
│     │  │     ├─ Chama: listClientTrainingPlans()
│     │  │     └─ isEditable={true}
│     │  ├─ <CheckInsPanel>
│     │  └─ <ExecutionTab> (sessions review)
│     │
│     └─ <CheckInsPanel>
│
└─ <NotificationsPage> (Cliente)
   └─ <NotificationList>
      └─ Mostra: notificações não-lidas
         └─ Clica → /plans, /today, etc
```

---

## 8. Data Flow (Redux/Context Simulation)

```
┌─────────────────────────────────────┐
│ API Layer                           │
├─────────────────────────────────────┤
│ GET /my-training-plans              │
│ GET /my-sessions (today)            │
│ GET /notifications                  │
│ GET /clients/:clientId/plans        │
│ POST /training-plans (profissional) │
└────────────────┬────────────────────┘
                 │
         ┌───────▼────────┐
         │ Feature Store  │
         ├────────────────┤
         │ trainingPlans: │
         │  - id          │
         │  - name        │
         │  - status      │
         │  - startDate   │
         │  - sessions[]  │
         │                │
         │ notifications: │
         │  - id          │
         │  - read        │
         │  - type        │
         │  - link        │
         └───────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────────────┐  ┌────────▼─────┐
│ Dashboard      │  │ PlansPage    │
│ (TrainingCard) │  │ (CardList)   │
└────────────────┘  └──────────────┘
```

---

## 9. Mobile Layout (Responsividade)

### Mobile (375px - Gym)
```
┌──────────────────────┐
│ 🏋️ PeakForm          │ (navbar)
├──────────────────────┤
│ Dashboard            │
│                      │
│ 📌 Novo plano        │
│ "Musculação"         │
│ ACTIVE               │
│ [Ver treino] ◄────── CTA grande
│                      │
│ ─────────────────    │
│                      │
│ Treino de hoje       │
│ [Iniciar] ◄───────── Huge button
│                      │
│ Últimas sessões      │
│ • Set 1: 10kg x 8    │
│ • Set 2: 12kg x 6    │
└──────────────────────┘

Screen height: 667px
Touch target: 44px min ✓
```

### Desktop (1440px - Planejamento)
```
┌─────────────────────────────────────────────────────────┐
│ 🏋️ PeakForm                          Notificações 🔔 (2) │
├─────────────────────────────────────────────────────────┤
│ Clientes (300px)    │ Detalhes (1100px)                 │
├─────────────────────┼─────────────────────────────────┤
│ Busca & filtro      │ João Silva                       │
│ Status: 12 ACTIVE   │ ─────────────────────────────────│
│                     │                                  │
│ • client2           │ Treino Musculação               │
│   👤 Avatar         │ ACTIVE • Início: 24 set         │
│   + 1 plano         │                                  │
│   ! Contraind.      │ [Editar] [Arquivar] [...]        │
│ ◄ Clicável         │                                  │
│                     │ Sessions (12)                    │
│ • client3           │ ┌──────────────────────────────┐│
│ • client4           │ │ Sex 22 — Upper Body           ││
│ • ...               │ │ 5 exercícios, 45 min          ││
└─────────────────────│ │ [Editar] [Ver execução]       ││
                     │ └──────────────────────────────┘│
                     │ ┌──────────────────────────────┐│
                     │ │ Seg 25 — Lower Body           ││
                     │ └──────────────────────────────┘│
                     └──────────────────────────────────┘
```

---

## 10. Sucesso Metrics (Antes vs Depois)

```
MÉTRICA                   ANTES (Baseline)  DEPOIS (Target)
──────────────────────────────────────────────────────────
% Cliente descobre plano  ❌ ~10%           ✅ > 90%
Cliques para plano        ❌ ∞ (não acha)  ✅ < 3
Tempo em /today           ❌ < 1 min        ✅ > 5 min
NPS (treino)              ❌ ? (baixo)      ✅ > 7/10
Crashes/errors            ❌ ? (vários)     ✅ 0
Performance /today        ❌ ? ms           ✅ < 500ms
Mobile usabilidade (gym)  ❌ Ruim           ✅ Excelente
Plan completion rate      ❌ ? %            ✅ > 70%
```

---

## 11. Risk Matrix

```
             Probabilidade
             Baixa   Média   Alta
Impacto ─────────────────────────────
Alto     │        ●         ●     (Diagnóstico errado)
Médio    │              ●   ●     (Performance issue)
Baixa    │   ●              ●     (Minor UX glitch)

● = Risco coberto
```

---

## 12. Dependencies Graph

```
Fase 0 (Diagnóstico)
    │
    ├─→ ✅ Backend OK?
    │   ├─→ Fase 1 (Discovery) ────┐
    │   ├─→ Fase 2 (Components) ───┼─→ Fase 5 (QA)
    │   ├─→ Fase 3 (Mobile) ────────┘
    │   │
    │   └─→ Fase 4 (Notification) ──→ Fase 5 (QA)
    │
    └─→ ❌ Backend com problema?
        └─→ Fix Backend (1-2 dias)
            └─→ Re-fazer Fase 0
                └─→ Continuar fases 1-4
```

---

## 13. Component Story (Storybook Preview)

```
TrainingPlanCard Component
──────────────────────────

Default (Client view):
┌──────────────────────────────┐
│ 🟢 ACTIVE    Musculação      │
│                              │
│ Início: 24 de setembro       │
│ Próxima: hoje às 10h         │
│                              │
│ [Ver treino →]               │
└──────────────────────────────┘

Editable (Professional view):
┌──────────────────────────────┐
│ 🟢 ACTIVE    Musculação      │
│                              │
│ Início: 24 de setembro       │
│ Próxima: hoje às 10h         │
│                              │
│ [Ver treino] [Editar] [⋮]    │
└──────────────────────────────┘

Draft (Editing):
┌──────────────────────────────┐
│ 🟡 DRAFT     Musculação (...)│
│                              │
│ Início: 24 de setembro       │
│ Sessões: 0/12 criadas        │
│                              │
│ [Continuar edição]           │
└──────────────────────────────┘

Loading:
┌──────────────────────────────┐
│ ▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓            │
│                              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓              │
│ ▓▓▓▓▓▓▓▓                     │
│                              │
│ ▓▓▓▓▓▓▓▓▓▓ ▓▓▓               │
└──────────────────────────────┘
```

---

**Documento Visual:** `/docs/TRAINING_REFACTOR_VISUAL.md`  
**Voltar para análise completa:** `/docs/TRAINING_REFACTOR_ANALYSIS.md`
