# Training System Refactor — Progress Tracker

**Atualizado:** 2026-09-23  
**Status Geral:** 🟠 Planejamento  

---

## 📊 Visão Geral de Progresso

```
Fase 0: Diagnóstico & Validação
████████████████████████████████████████████ 100% (✅ Concluída)

Fase 1: Discovery Card
████████████████████████████████████████████ 100% (✅ Implementada — ver FASE1_STATUS)

Fase 2: Componentes Unificados
████████████████████████████████████████████ 100% (✅ Implementada — ver FASE2_STATUS)

Fase 3: Responsividade
████████████████████████████████████████████ 100% (✅ Implementada — ver FASE3_STATUS)

Fase 4: Notificação (Backend)
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% (⏳ Próxima)

Fase 5: Validação Completa
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% (⏳ Aguardando Fases 1-4)

Fase 6: Monitoria
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% (⏳ Aguardando Fase 5)
```

---

## 🎯 Fase 0: Diagnóstico & Validação (BLOCKER)

**Status:** 🔴 **Não iniciado**  
**Tempo Estimado:** 2-4 horas  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 0.1 | Verificar BD: existe `TrainingPlan` para `client2`? | ⏳ | Run: `SELECT * FROM training_plans WHERE...` |
| 0.2 | Testar API endpoint `GET /my-training-plans` | ⏳ | `curl -H "Authorization: Bearer $TOKEN" ...` |
| 0.3 | Validar relação: `TrainingPlan.clientId` está preenchido? | ⏳ | Check schema + DB |
| 0.4 | Revisar controller: filtro está correto? | ⏳ | Code review: `/my-training-plans` |
| 0.5 | Compilar relatório final | ⏳ | Update este doc com findings |

### Bloqueadores & Dependências
- 🔴 **BLOCKER:** Fase 1-6 esperam resultado desta fase

### Saída Esperada
- [ ] Relatório com uma de 3 conclusões:
  - ✅ "Backend OK, problema é frontend"
  - ✅ "Backend retorna vazio, precisa de fix"
  - ✅ "Schema quebrado, precisa migration"

### Findings
(A ser atualizado após execução)

---

## 🎨 Fase 1: Discovery Card — Cliente vê treino no Dashboard

**Status:** 🟡 **Não iniciado** (aguardando Fase 0)  
**Tempo Estimado:** 1 dia  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 1.1 | Criar componente `TrainingAssignmentCard` | ⏳ | Props, render, estilos |
| 1.2 | Integrar em `/dashboard` (Cliente) | ⏳ | Posição, loading, error handling |
| 1.3 | Testes BDD | ⏳ | 3 cenários: com plano, sem plano, com sessão hoje |
| 1.4 | Code review & merge | ⏳ | PR review checklist |

### Checklist Detalhado (1.1)

```
TrainingAssignmentCard:
├─ [ ] 1.1a — Tipos (Props, interfaces)
├─ [ ] 1.1b — Render: nome do plano + status + próxima sessão
├─ [ ] 1.1c — Status badge (colors: ACTIVE=green, DRAFT=yellow)
├─ [ ] 1.1d — Date formatter (PT-BR, ex: "22 de set")
├─ [ ] 1.1e — CTA button "[Ver meus treinos]" → /plans
├─ [ ] 1.1f — Responsive: mobile 1-col, desktop 2-col
└─ [ ] 1.1g — Storybook component demo
```

### BDD Scenarios (1.3)

```gherkin
Feature: Training Assignment Discovery Card

Scenario: Cliente vê card com plano ativo
  Given cliente com 1 plano ACTIVE
  When acessa /dashboard
  Then vê "Você tem 1 plano ativo"
  And vê nome do plano
  And vê status badge (green)
  And vê CTA "[Ver meus treinos]"

Scenario: Cliente sem plano não vê card
  Given cliente sem planos
  When acessa /dashboard
  Then NÃO vê TrainingAssignmentCard
  And dashboard normal continua

Scenario: Card mostra próxima sessão se hoje
  Given cliente com plano com sessão hoje
  When acessa /dashboard
  Then vê "Próxima sessão hoje às 10h"
  And sessão detalhe: [exercícios, duração]
```

### Bloqueadores
- Fase 0 precisa confirmar backend OK

### Saída Esperada
- [ ] Card rendendo em /dashboard (dev mode)
- [ ] Testes BDD passando
- [ ] PR aberto & code review completo

---

## 🧩 Fase 2: Componentes Unificados — TrainingPlanCard

**Status:** 🟡 **Não iniciado** (aguardando Fase 0)  
**Tempo Estimado:** 1.5 dias  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 2.1 | Criar `TrainingPlanCard` reutilizável | ⏳ | Props: plan, nextSession, isEditable |
| 2.2 | Refatorar `/plans/page.tsx` (Cliente) | ⏳ | Substituir `<li>` simples por TrainingPlanCard |
| 2.3 | Refatorar `TrainingPlansTab` (Profissional) | ⏳ | Usar TrainingPlanCard com `isEditable=true` |
| 2.4 | Melhorar `TodayTrainingCard` | ⏳ | Padrão visual consistente |
| 2.5 | Testes BDD | ⏳ | Card renderiza, status cores, CTAs navegam |

### Layout de `TrainingPlanCard`

```
┌─────────────────────────────────────┐
│ [Status Badge]  [Plano Name]        │  (nome destacado)
│                                      │
│ Início: 22 de set de 2026            │  (data clara)
│ Próxima sessão: hoje às 10h          │  (info crítica)
│                                      │
│ [Ver treino →]  [Editar] [Menu ⋮]   │  (CTAs + ações)
└─────────────────────────────────────┘
```

### Checklist Detalhado (2.1)

```
TrainingPlanCard:
├─ [ ] 2.1a — Props interface (plan, nextSession, isEditable)
├─ [ ] 2.1b — Status badge com cores (ACTIVE, DRAFT, COMPLETED)
├─ [ ] 2.1c — Data formatação PT-BR + relative (ex: "hoje", "amanhã", "22 ago")
├─ [ ] 2.1d — Layout responsivo (mobile: stack, desktop: row)
├─ [ ] 2.1e — CTA buttons com hover states
├─ [ ] 2.1f — Ações contextuais (editar, clonar, arquivar)
├─ [ ] 2.1g — Loading skeleton variant
└─ [ ] 2.1h — Empty state variant (sem próxima sessão)
```

### Saída Esperada
- [ ] `TrainingPlanCard` component em `features/training-plans/components/`
- [ ] `/plans`, `TrainingPlansTab`, `TodayTrainingCard` usando o novo component
- [ ] Testes BDD passando
- [ ] Visual consistente em desktop + mobile

---

## 📱 Fase 3: Responsividade & Layout

**Status:** 🟡 **Não iniciado** (aguardando Fase 0)  
**Tempo Estimado:** 1.5 dias  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 3.1 | Review `/today/page.tsx` | ⏳ | Mobile 1-col, Desktop 2-col |
| 3.2 | Review `/plans/page.tsx` | ⏳ | Idem, + filtros responsivos |
| 3.3 | Review `/dashboard` | ⏳ | Cards full-width mobile, grid desktop |
| 3.4 | Testes em devices reais | ⏳ | iPhone SE, Pixel 5, iPad, Desktop |
| 3.5 | Testes BDD (responsividade) | ⏳ | Layout muda em breakpoints |

### Breakpoints (Tailwind Default)

| Device | Width | Breakpoint |
|--------|-------|-----------|
| iPhone SE | 375px | `sm` (640px) ← mobile |
| Pixel 5 | 412px | `sm` (640px) ← mobile |
| iPad | 768px | `md` (768px) ← tablet |
| Laptop | 1440px | `lg` (1024px) ← desktop |

### Checklist `/today`

```
Mobile (375px):
├─ [ ] 3.1a — Stack vertical: plano info, depois exercícios
├─ [ ] 3.1b — Sessão detalhe expandível
├─ [ ] 3.1c — Botões 44px+ touch targets
├─ [ ] 3.1d — Sem scroll horizontal
└─ [ ] 3.1e — Visível no gym (outdoor lighting)

Desktop (1440px):
├─ [ ] 3.1f — 2-col: esquerda plano info, direita log
├─ [ ] 3.1g — Mais espaço entre exercícios
├─ [ ] 3.1h — Previous session reference visível
└─ [ ] 3.1i — Rest timer sidecar
```

### Saída Esperada
- [ ] Screenshots mobile (iPhone SE, Pixel 5)
- [ ] Screenshots tablet (iPad)
- [ ] Screenshots desktop (1440px)
- [ ] Testes BDD: layout muda em breakpoints
- [ ] Lighthouse score > 80

---

## 🔔 Fase 4: Notificação & Descoberta (Backend)

**Status:** 🟡 **Não iniciado** (aguardando Fase 0)  
**Tempo Estimado:** 2 dias  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 4.1 | Evento ao criar plano | ⏳ | Emit: `'training-plan.created'` |
| 4.2 | Handler: E-mail ao cliente | ⏳ | Template + MailService |
| 4.3 | Schema: Notificação in-app | ⏳ | Table `Notification` + migration |
| 4.4 | Handler: Notificação in-app | ⏳ | Insert quando plano criado |
| 4.5 | Endpoint: `GET /notifications` | ⏳ | List, filter, paginate |
| 4.6 | Frontend: Badge + bell icon | ⏳ | Nav bar, link para /notifications |
| 4.7 | Testes BDD (E2E) | ⏳ | Cria → email → notificação → badge |

### Workflow

```
Profissional: POST /training-plans
├─ Validar client intake
├─ Criar TrainingPlan
├─ Gerar Sessions
├─ ✅ EMIT EVENT: training-plan.created
│
EVENT HANDLER (training-plan.created):
├─ [ ] 4.2 — Enviar e-mail
│  ├─ To: client.email
│  ├─ Template: "Novo plano de treino"
│  ├─ Link: http://app/plans
│  └─ Via: MailerService (MailHog local)
│
├─ [ ] 4.3 — Criar Notificação
│  ├─ INSERT notification
│  │  (userId, type, title, message, link, read, createdAt)
│  │  userId = client.id
│  │  type = 'TRAINING_PLAN_CREATED'
│  │  title = "Novo plano"
│  │  message = "${plan.name} de ${professional.name}"
│  │  link = "/plans"
│  │
│  └─ [Opcional] Emit WebSocket se cliente online

Cliente (Frontend):
├─ GET /notifications (polling ou socket)
├─ Vê badge: 🔔 (1)
├─ Clica badge → /notifications
├─ Vê: "Novo plano: [plan name]"
└─ Clica → /plans
```

### BDD Scenarios (4.7)

```gherkin
Feature: Training Plan Assignment Notification

Scenario: Criar plano → cliente recebe notificação
  Given profissional autenticado com PT specialization
  And cliente vinculado
  And cliente intake COMPLETED
  
  When profissional cria plano "Musculação"
  Then servidor envia e-mail para cliente
  
  When cliente faz login
  Then vê badge 🔔 na nav bar
  And clica badge
  Then vê notificação "Novo plano: Musculação"
  And link aponta para /plans

Scenario: Notificação marca como read
  Given cliente vê notificação (unread)
  When clica notificação
  Then navegam para /plans
  And notificação marca read

Scenario: E-mail template correto
  Given plano "Hipertrofia — 8 semanas"
  When criado
  Then e-mail contém:
    - Subject: "Novo plano de treino"
    - Body: nome plano
    - Body: data início
    - CTA: "Ver plano"
```

### Saída Esperada
- [ ] Event emitter funcionando
- [ ] E-mail enviado + verificado em MailHog
- [ ] Schema Notification + migration
- [ ] Endpoint GET /notifications funciona
- [ ] Badge aparece no app
- [ ] Testes BDD E2E passando

---

## ✅ Fase 5: Validação Completa

**Status:** 🟡 **Não iniciado** (aguardando Fases 1-4)  
**Tempo Estimado:** 1 dia  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 5.1 | Teste E2E manual completo | ⏳ | Profissional → Cliente → Executa |
| 5.2 | Teste mobile (gym scenario) | ⏳ | WiFi ruim, log de exercícios |
| 5.3 | Teste volume (10+ planos) | ⏳ | Performance, rendering |
| 5.4 | Testes BDD complete | ⏳ | 3-5 cenários E2E, edge cases |
| 5.5 | Performance audit | ⏳ | < 1s /plans, < 500ms /today |
| 5.6 | Acessibilidade | ⏳ | Alt text, contrast, keyboard nav |

### Checklist E2E (5.1)

```
Fluxo Completo:
├─ [ ] 5.1a — Login profissional
├─ [ ] 5.1b — Acessa clientes, seleciona client2
├─ [ ] 5.1c — Intake COMPLETED ✓
├─ [ ] 5.1d — Clica "Criar plano"
├─ [ ] 5.1e — Preenche: nome, data, mesociclos, sessões
├─ [ ] 5.1f — Salva plano ✓
├─ [ ] 5.1g — Volta para /clients → vê plano listado
│
├─ [ ] 5.1h — Logout profissional
├─ [ ] 5.1i — Login cliente
├─ [ ] 5.1j — /dashboard → vê "Novo plano"
├─ [ ] 5.1k — Vê badge 🔔 (notificação)
├─ [ ] 5.1l — Clica → /plans
├─ [ ] 5.1m — Vê plano "Musculação" com status ACTIVE
├─ [ ] 5.1n — Clica "Ver treino"
├─ [ ] 5.1o — /today mostra sessão de hoje (se há)
├─ [ ] 5.1p — Log exercício, série, reps
├─ [ ] 5.1q — Dados salvam ✓
│
└─ [ ] 5.1r — Login profissional → vê execução do cliente
```

### Performance Targets (5.5)

```
Target:
├─ [ ] 5.5a — /plans com 10 planos: < 1 segundo
├─ [ ] 5.5b — /today com 20 exercícios: < 500ms
├─ [ ] 5.5c — /dashboard: < 800ms
├─ [ ] 5.5d — Sem N+1 queries
├─ [ ] 5.5e — Lighthouse score: > 80

Measurement:
├─ Network tab: time to interactive
├─ Database: query count + duration
├─ Frontend: React DevTools profiler
└─ Lighthouse: Chrome audit
```

### Acessibilidade (5.6)

```
Checklist:
├─ [ ] 5.6a — Alt text em todas as imagens
├─ [ ] 5.6b — Contrast ratio >= 4.5:1 (text)
├─ [ ] 5.6c — Contrast ratio >= 3:1 (UI elements)
├─ [ ] 5.6d — Keyboard navigation (Tab, Enter, Esc)
├─ [ ] 5.6e — Focus ring visível
├─ [ ] 5.6f — Screen reader (NVDA/JAWS): labels, roles
└─ [ ] 5.6g — Headings hierarchy (H1, H2, H3)
```

### Saída Esperada
- [ ] E2E manual completo sem erros
- [ ] Screenshots mobile (gym test)
- [ ] Performance report (screenshots DevTools)
- [ ] Testes BDD complete passando
- [ ] Acessibilidade checklist completo
- [ ] Pronto para release

---

## 📊 Fase 6: Monitoria & Iteração (Ongoing)

**Status:** 🟡 **Não iniciado** (aguardando Fase 5)  
**Tempo Estimado:** 1-2 semanas  
**Responsável:** [TBD]

### Tarefas

| # | Tarefa | Status | Notas |
|-|--------|--------|-------|
| 6.1 | Analytics: clientId → /plans visit | ⏳ | Track conversion |
| 6.2 | Analytics: time in /today | ⏳ | Track engagement |
| 6.3 | Feedback: entrevistas com clientes | ⏳ | 3-5 clientes |
| 6.4 | Bug tracking: issues em produção | ⏳ | Monitorar erros |
| 6.5 | v2 Roadmap: próximos passos | ⏳ | Compilar learnings |

### KPIs a Monitorar

| KPI | Baseline | Target |
|-----|----------|--------|
| % clients with plans accessing `/plans` | ? | > 80% |
| Avg time in `/today` | ? | > 5 min |
| Plan completion rate | ? | > 70% |
| NPS training experience | ? | > 7/10 |
| Error rate (training screens) | ? | < 0.5% |

### Feedback Questions (6.3)

```
Entrevistas com clientes:
1. "Foi fácil encontrar seus treinos quando foram criados?"
2. "Qual parte mais confundiu você?"
3. "O que gostaria que tivesse?"
4. "Usou o app no gym? Como foi?"
5. "Voltaria a usar para próximo treino?"
```

### Saída Esperada
- [ ] Dashboard de analytics criado
- [ ] Relatório de feedback compilado
- [ ] Bug backlog priorizado
- [ ] v2 Roadmap definido

---

## 📈 Dependências & Crítica

```
Fase 0 (Diagnóstico)
  ├─→ Fase 1-3 (Frontend)
  │    ├─→ Fase 5 (Validação)
  │    └─→ Fase 6 (Monitoria)
  └─→ Fase 4 (Backend)
       └─→ Fase 5 (Validação)
            └─→ Fase 6 (Monitoria)
```

**Critical Path:** Fase 0 → 1-3 (paralelo) → 4 (paralelo) → 5 → 6

---

## 🎯 Marcos (Milestones)

| Marco | Fase | Data | Objetivo |
|-------|------|------|----------|
| **Diagnóstico Completo** | 0 | 2026-09-23 | Identificar raiz |
| **Discovery Card Live** | 1 | 2026-09-24 | Cliente vê plano no dashboard |
| **Componentes Unificados** | 2 | 2026-09-25 | Visual consistente |
| **Responsividade OK** | 3 | 2026-09-26 | Mobile + desktop funciona |
| **Notificação E2E** | 4 | 2026-09-27 | Cliente notificado |
| **Validação Completa** | 5 | 2026-09-28 | Tudo funciona |
| **Produção** | 5 | 2026-09-28 | Deploy |
| **v2 Feedback** | 6 | 2026-10-01 | Análise de uso |

---

## 🔄 Última Atualização

| Campo | Valor |
|-------|-------|
| **Data** | 2026-09-23 |
| **Status Geral** | � Em execução |
| **Fase Atual** | 4 (Notificação) — Fases 0-3 concluídas |
| **% Completo** | ~65% (0-3 de 0-5) |
| **Bloqueadores** | `next build` requer `sudo rm -rf apps/web/.next/types` (root-owned) |

---

## 📝 Notas & Observações

- [ ] **Parallelização:** Fases 1-3 podem correr em paralelo (mesma pessoa ou múltiplos devs)
- [ ] **Fase 4:** Pode começar quando Fase 0 terminar (não bloqueia 1-3)
- [ ] **Prioridade:** Fase 1 (Discovery) é a mais crítica para UX
- [ ] **Timeline:** 10 dias assumindo dev experiente, daily standup, sem bloqueadores

---

**Documento de tracking:** `/docs/TRAINING_REFACTOR_TRACKER.md`  
**Análise completa:** `/docs/TRAINING_REFACTOR_ANALYSIS.md`  
**Quick ref:** `/docs/TRAINING_REFACTOR_QUICK_REF.md`
